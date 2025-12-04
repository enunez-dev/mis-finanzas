-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist to start fresh
drop table if exists public.transactions;
drop table if exists public.budget_details;
drop table if exists public.budgets;
drop table if exists public.categories;
drop table if exists public.profiles;

-- Create categories table with parent_id for subcategories and default_amount
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  parent_id uuid references public.categories(id), -- Null for top-level, set for subcategories
  name text not null,
  type text check (type in ('income', 'expense')) not null,
  icon text,
  color text,
  default_amount numeric(12, 2) default 0, -- Default budget amount
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create budgets table (Global Header: Month)
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  month text not null check (month ~ '^\d{4}-\d{2}$'), -- Format YYYY-MM
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(month)
);

-- Create budget_details table (Lines: Subcategory + Amount)
create table public.budget_details (
  id uuid default uuid_generate_v4() primary key,
  budget_id uuid references public.budgets(id) on delete cascade not null,
  category_id uuid references public.categories(id) not null, -- Subcategory
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(budget_id, category_id)
);

-- Create transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  budget_id uuid references public.budgets(id), -- Link to budget
  category_id uuid references public.categories(id),
  amount numeric(12, 2) not null,
  date date not null default CURRENT_DATE,
  description text,
  type text check (type in ('income', 'expense')) not null,
  receipt_url text, -- URL of the uploaded receipt image
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS
alter table public.categories disable row level security;
alter table public.budgets disable row level security;
alter table public.budget_details disable row level security;
alter table public.transactions disable row level security;

-- Storage Setup (Requires 'storage' schema to be available in Supabase)
-- Note: In a real Supabase SQL editor, you might need to run this separately or ensure storage extension is enabled.
-- We will try to insert into storage.buckets if it exists, otherwise the user might need to create it manually via dashboard.

insert into storage.buckets (id, name, public)
values ('file', 'file', true)
on conflict (id) do nothing;

-- Storage Policies (Allow public access for this single-user app)
create policy "Public Access"
  on storage.objects for all
  using ( bucket_id = 'file' )
  with check ( bucket_id = 'file' );

-- Seed Parent Categories
insert into public.categories (name, type, icon, color) values 
('Ahorro e Inversión', 'expense', 'trending-up', '#10b981'),
('Gastos Fijos', 'expense', 'home', '#ef4444'),
('Gustos', 'expense', 'coffee', '#f59e0b'),
('Ingresos', 'income', 'dollar-sign', '#3b82f6');

-- Seed Subcategories and Default Budgets
do $$
declare
  ahorro_id uuid;
  fijos_id uuid;
  gustos_id uuid;
  
  -- Subcategory IDs
  sub_id uuid;
  
  -- Budget Header ID
  budget_id uuid;
  
  current_month text := to_char(current_date, 'YYYY-MM');
begin
  -- Get Parent IDs
  select id into ahorro_id from public.categories where name = 'Ahorro e Inversión';
  select id into fijos_id from public.categories where name = 'Gastos Fijos';
  select id into gustos_id from public.categories where name = 'Gustos';

  -- Create Global Budget Header for Current Month
  insert into public.budgets (month) values (current_month) returning id into budget_id;

  -- Ahorro e Inversión Subcategories & Budgets
  insert into public.categories (parent_id, name, type, default_amount) values (ahorro_id, 'Ahorro Corto Plazo', 'expense', 1650) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 1650);
  
  insert into public.categories (parent_id, name, type, default_amount) values (ahorro_id, 'Inversión Lote', 'expense', 1319) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 1319);
  
  insert into public.categories (parent_id, name, type, default_amount) values (ahorro_id, 'Retiro', 'expense', 550) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 550);

  -- Gastos Fijos Subcategories & Budgets
  insert into public.categories (parent_id, name, type, default_amount) values (fijos_id, 'Agua', 'expense', 120) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 120);
  
  insert into public.categories (parent_id, name, type, default_amount) values (fijos_id, 'Alquiler', 'expense', 1740) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 1740);
  
  insert into public.categories (parent_id, name, type, default_amount) values (fijos_id, 'Comida', 'expense', 2164) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 2164);
  
  insert into public.categories (parent_id, name, type, default_amount) values (fijos_id, 'Jardín', 'expense', 900) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 900);
  
  insert into public.categories (parent_id, name, type, default_amount) values (fijos_id, 'Luz', 'expense', 300) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 300);

  -- Gustos Subcategories & Budgets
  insert into public.categories (parent_id, name, type, default_amount) values (gustos_id, 'Gym', 'expense', 200) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 200);
  
  insert into public.categories (parent_id, name, type, default_amount) values (gustos_id, 'Merienda', 'expense', 200) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 200);
  
  insert into public.categories (parent_id, name, type, default_amount) values (gustos_id, 'Otros', 'expense', 1580) returning id into sub_id;
  insert into public.budget_details (budget_id, category_id, amount) values (budget_id, sub_id, 1580);

end $$;
