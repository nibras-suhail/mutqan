-- ============================================================
-- مشروع متقن — Complete Database Schema with RLS
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- CUSTOM TYPES
-- ============================================================
create type order_status as enum ('received', 'in_progress', 'ready', 'delivered');
create type payment_method as enum ('cash', 'transfer');
create type attachment_type as enum ('before', 'after', 'doc');
create type user_role as enum ('admin', 'partner');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. users (syncs with Supabase Auth)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text unique not null,
  role user_role not null default 'partner',
  created_at timestamptz not null default now()
);
alter table public.users enable row level security;

-- 2. orders
create sequence if not exists order_no_seq start 1 increment 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null default concat('WO-', lpad(nextval('order_no_seq')::text, 4, '0')),
  customer_name text not null,
  customer_phone text,
  part_type text not null,
  repair_type text not null,
  status order_status not null default 'received',
  assigned_to uuid references public.users(id),
  created_by uuid references public.users(id),
  received_at timestamptz not null default now(),
  delivered_at timestamptz,
  repair_cost decimal(10,2) not null default 0,
  warranty_days int not null default 0,
  warranty_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;

-- 3. payments
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  -- total_amount removed — source of truth is orders.repair_cost
  amount decimal(10,2) not null,
  method payment_method not null default 'cash',
  reference text,
  receipt_url text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

-- 4. transfers (internal between partners)
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.users(id),
  to_user uuid not null references public.users(id),
  amount decimal(10,2) not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.transfers enable row level security;

-- 5. attachments (images uploaded to Supabase Storage)
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  url text not null,
  type attachment_type not null,
  uploaded_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.attachments enable row level security;

-- 6. audit_log
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid not null references public.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

-- 7. saved_reports
create table public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date_from timestamptz not null,
  date_to timestamptz not null,
  total_orders int not null default 0,
  total_delivered int not null default 0,
  total_collected decimal(10,2) not null default 0,
  total_pending decimal(10,2) not null default 0,
  cash_total decimal(10,2) not null default 0,
  transfer_total decimal(10,2) not null default 0,
  total_transfers decimal(10,2) not null default 0,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.saved_reports enable row level security;

-- 8. warranty_claims
create table public.warranty_claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  return_date timestamptz not null default now(),
  problem_description text not null,
  decision text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.warranty_claims enable row level security;

-- 8. inventory
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  purchase_price decimal(10,2) not null default 0,
  selling_price decimal(10,2),
  supplier text,
  notes text,
  added_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.inventory enable row level security;

create policy "inventory_select" on public.inventory for select
  using (public.is_authenticated());
create policy "inventory_insert" on public.inventory for insert
  with check (public.is_authenticated());
create policy "inventory_update" on public.inventory for update
  using (public.is_authenticated());
create policy "inventory_delete" on public.inventory for delete
  using (public.is_admin());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update warranty_expires_at when delivered
create or replace function public.set_warranty()
returns trigger as $$
begin
  if new.status = 'delivered' and old.status != 'delivered' then
    new.delivered_at := now();
    new.warranty_expires_at := now() + (new.warranty_days || ' days')::interval;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_set_warranty
  before update on public.orders
  for each row
  when (new.status = 'delivered')
  execute function public.set_warranty();

-- Update updated_at on orders
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_orders_updated_at
  before update on public.orders
  for each row
  execute function public.update_updated_at();

-- Auto-create public.user on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, 'partner');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_create_user_on_signup
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Audit log function
create or replace function public.log_audit()
returns trigger as $$
declare
  table_name text := tg_table_name;
  action text;
  old_data jsonb;
  new_data jsonb;
begin
  if tg_op = 'INSERT' then
    action := 'INSERT';
    new_data := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    action := 'UPDATE';
    old_data := to_jsonb(old);
    new_data := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    action := 'DELETE';
    old_data := to_jsonb(old);
  end if;

  insert into public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (table_name, coalesce(new.id, old.id), action, coalesce(auth.uid(), (select id from public.users limit 1)), old_data, new_data);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger trg_orders_audit after insert or update or delete on public.orders
  for each row execute function public.log_audit();
create trigger trg_payments_audit after insert or update or delete on public.payments
  for each row execute function public.log_audit();
create trigger trg_transfers_audit after insert or update or delete on public.transfers
  for each row execute function public.log_audit();
create trigger trg_warranty_claims_audit after insert or update or delete on public.warranty_claims
  for each row execute function public.log_audit();

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: authenticated users only
create or replace function public.is_authenticated()
returns boolean as $$
  select auth.role() = 'authenticated';
$$ language sql stable;

-- Helper: check if user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$ language sql stable;

-- users
create policy "users_select_own" on public.users for select
  using (auth.uid() = id or public.is_admin());
create policy "users_insert" on public.users for insert
  with check (auth.uid() = id);
create policy "users_update_own" on public.users for update
  using (auth.uid() = id);

-- orders
create policy "orders_select" on public.orders for select
  using (public.is_authenticated());
create policy "orders_insert" on public.orders for insert
  with check (public.is_authenticated());
create policy "orders_update" on public.orders for update
  using (public.is_authenticated());
create policy "orders_delete" on public.orders for delete
  using (public.is_admin());

-- payments
create policy "payments_select" on public.payments for select
  using (public.is_authenticated());
create policy "payments_insert" on public.payments for insert
  with check (public.is_authenticated());
create policy "payments_update" on public.payments for update
  using (public.is_authenticated());
create policy "payments_delete" on public.payments for delete
  using (public.is_admin());

-- transfers
create policy "transfers_select" on public.transfers for select
  using (public.is_authenticated());
create policy "transfers_insert" on public.transfers for insert
  with check (public.is_authenticated());
create policy "transfers_delete" on public.transfers for delete
  using (public.is_authenticated());

-- attachments
create policy "attachments_select" on public.attachments for select
  using (public.is_authenticated());
create policy "attachments_insert" on public.attachments for insert
  with check (public.is_authenticated());
create policy "attachments_delete" on public.attachments for delete
  using (public.is_authenticated());

-- audit_log
create policy "audit_log_select" on public.audit_log for select
  using (public.is_admin());
create policy "audit_log_insert" on public.audit_log for insert
  with check (public.is_authenticated());

-- saved_reports
create policy "saved_reports_select" on public.saved_reports for select
  using (public.is_authenticated());
create policy "saved_reports_insert" on public.saved_reports for insert
  with check (auth.uid() = created_by);
create policy "saved_reports_delete" on public.saved_reports for delete
  using (auth.uid() = created_by or public.is_admin());

-- warranty_claims
create policy "warranty_claims_select" on public.warranty_claims for select
  using (public.is_authenticated());
create policy "warranty_claims_insert" on public.warranty_claims for insert
  with check (public.is_authenticated());
create policy "warranty_claims_update" on public.warranty_claims for update
  using (public.is_authenticated());
create policy "warranty_claims_delete" on public.warranty_claims for delete
  using (public.is_admin());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments_storage_select" on storage.objects for select
  using (bucket_id = 'attachments');

create policy "attachments_storage_insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

create policy "attachments_storage_delete" on storage.objects for delete
  using (bucket_id = 'attachments' and auth.role() = 'authenticated');

-- ============================================================
-- DELIVERY CONFIRMATION (public RPCs, security definer)
-- ============================================================

create or replace function public.get_order_for_delivery(p_order_no text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'id', o.id,
    'order_no', o.order_no,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'part_type', o.part_type,
    'repair_type', o.repair_type,
    'repair_cost', o.repair_cost,
    'status', o.status,
    'warranty_days', o.warranty_days,
    'warranty_expires_at', o.warranty_expires_at,
    'created_at', o.created_at
  ) into result
  from public.orders o
  where o.order_no = p_order_no;
  return result;
end;
$$ language plpgsql security definer;

create or replace function public.confirm_delivery(p_order_no text)
returns boolean as $$
declare
  affected_rows int;
begin
  update public.orders
  set status = 'delivered'
  where order_no = p_order_no and status != 'delivered';
  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$ language plpgsql security definer;

-- Allow anon and authenticated to call these RPCs
grant execute on function public.get_order_for_delivery to anon, authenticated;
grant execute on function public.confirm_delivery to anon, authenticated;

-- ============================================================
-- REALTIME: enable for transfers only
-- ============================================================
alter publication supabase_realtime add table public.transfers;
alter publication supabase_realtime add table public.audit_log;
alter publication supabase_realtime add table public.payments;

-- ============================================================
-- MIGRATIONS (run manually in Supabase SQL Editor)
-- ============================================================
-- 1. remove total_amount from payments
-- alter table public.payments drop column total_amount;
--
-- 2. add created_by to orders + backfill existing rows
-- alter table public.orders add column created_by uuid references public.users(id);
-- update public.orders set created_by = (select id from public.users where email = 'qqsah0555@gmail.com') where created_by is null;
--
-- 3. create inventory table
-- create table public.inventory (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   category text,
--   quantity integer not null default 0,
--   min_quantity integer not null default 0,
--   purchase_price decimal(10,2) not null default 0,
--   selling_price decimal(10,2),
--   supplier text,
--   notes text,
--   added_by uuid references public.users(id),
--   created_at timestamptz not null default now(),
--   updated_at timestamptz not null default now()
-- );
-- alter table public.inventory enable row level security;
-- create policy "inventory_select" on public.inventory for select using (auth.role() = 'authenticated');
-- create policy "inventory_insert" on public.inventory for insert with check (auth.role() = 'authenticated');
-- create policy "inventory_update" on public.inventory for update using (auth.role() = 'authenticated');
-- create policy "inventory_delete" on public.inventory for delete using (auth.role() = 'authenticated');
