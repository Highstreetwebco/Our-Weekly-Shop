-- TEST DATA ONLY: 400 generic products and simulated retailer offers.
create table public.retailers (
  id text primary key,
  name text not null,
  basket_connection_supported boolean not null default false,
  is_test_data boolean not null default true
);

create table public.catalogue_products (
  id uuid primary key default gen_random_uuid(),
  test_sku text not null unique,
  name text not null,
  category text not null,
  brand text not null default 'Generic Test Brand',
  pack_quantity numeric(10,2) not null check (pack_quantity > 0),
  pack_unit text not null,
  portions_estimate numeric(10,2),
  is_test_data boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.retailer_offers (
  id uuid primary key default gen_random_uuid(),
  retailer_id text not null references public.retailers(id) on delete cascade,
  product_id uuid not null references public.catalogue_products(id) on delete cascade,
  price_pence integer not null check (price_pence > 0),
  loyalty_price_pence integer check (loyalty_price_pence > 0),
  available boolean not null default true,
  captured_at timestamptz not null default now(),
  is_test_data boolean not null default true,
  unique (retailer_id, product_id)
);

insert into public.retailers (id, name) values
('tesco','Tesco'),('sainsburys','Sainsbury''s'),('asda','Asda'),('morrisons','Morrisons'),
('aldi','Aldi'),('lidl','Lidl'),('waitrose','Waitrose'),('ocado','Ocado');

with bases(name, category, unit, base_qty, base_price, portions) as (
  values
  ('Chicken Breast','Meat & Fish','g',500,450,4),('Beef Mince','Meat & Fish','g',500,425,4),('Pork Sausages','Meat & Fish','count',8,300,4),('Salmon Fillets','Meat & Fish','count',2,475,2),
  ('Milk','Dairy & Eggs','ml',1000,145,8),('Cheddar Cheese','Dairy & Eggs','g',400,325,8),('Yoghurt','Dairy & Eggs','g',500,190,5),('Eggs','Dairy & Eggs','count',6,175,6),
  ('White Bread','Bakery','g',800,140,10),('Wraps','Bakery','count',8,180,4),('Burger Buns','Bakery','count',4,160,4),('Mini Baguettes','Bakery','count',4,210,4),
  ('Pasta','Cupboard','g',500,90,5),('Long Grain Rice','Cupboard','g',1000,160,10),('Chopped Tomatoes','Cupboard','g',400,55,4),('Kidney Beans','Cupboard','g',400,65,4),
  ('Potatoes','Fruit & Veg','g',2000,180,8),('Onions','Fruit & Veg','g',1000,95,10),('Cucumber','Fruit & Veg','count',1,75,4),('Lettuce','Fruit & Veg','count',1,85,4),
  ('Frozen Pizza','Frozen','g',350,275,1),('Oven Chips','Frozen','g',1000,225,6),('Southern Fried Chicken','Frozen','g',600,350,4),('Sweetcorn','Frozen','g',500,125,5),
  ('Diet Cola','Drinks','ml',2000,185,8),('Orange Squash','Drinks','ml',1000,175,20),('Coffee','Drinks','g',200,450,30),('Still Water','Drinks','ml',2000,65,8),
  ('Crisps','Snacks','count',6,175,6),('Chocolate Bars','Snacks','count',4,165,4),('Meat Snacks','Snacks','count',5,240,5),('Cheese Snacks','Snacks','count',6,220,6),
  ('Toothpaste','Bathroom','ml',75,150,null),('Toilet Roll','Bathroom','count',9,475,null),('Shampoo','Bathroom','ml',400,250,null),('Floss Picks','Bathroom','count',30,180,null),
  ('Kitchen Roll','Household','count',2,250,null),('Bin Bags','Household','count',20,220,null),('AA Batteries','Household','count',8,550,null),('Candles','Household','count',12,300,null)
), variants(label, multiplier, price_multiplier) as (
  values ('Value',0.5,0.65),('Small',0.75,0.82),('Standard',1.0,1.0),('Large',1.25,1.18),('Family',1.5,1.34),
  ('Twin Pack',2.0,1.75),('Premium',1.0,1.45),('Organic',1.0,1.55),('Easy Open',1.0,1.12),('Bulk',3.0,2.35)
)
insert into public.catalogue_products (test_sku,name,category,pack_quantity,pack_unit,portions_estimate)
select 'TEST-' || lpad(row_number() over()::text,4,'0'), b.name || ' ' || v.label, b.category,
       round((b.base_qty*v.multiplier)::numeric,2), b.unit,
       case when b.portions is null then null else round((b.portions*v.multiplier)::numeric,2) end
from bases b cross join variants v;

with ranked as (
  select p.id, p.test_sku, row_number() over(order by p.test_sku) as n,
         case p.category when 'Meat & Fish' then 425 when 'Dairy & Eggs' then 190 when 'Household' then 300 else 150 end as base
  from public.catalogue_products p where p.is_test_data
), retailer_factor(id, factor) as (
  values ('tesco',1.00),('sainsburys',1.03),('asda',0.98),('morrisons',1.02),
         ('aldi',0.91),('lidl',0.92),('waitrose',1.18),('ocado',1.10)
)
insert into public.retailer_offers (retailer_id,product_id,price_pence,loyalty_price_pence,available)
select rf.id, r.id,
       greatest(25,round((r.base + (r.n % 11)*17)*rf.factor)::int),
       case when rf.id in ('tesco','sainsburys','morrisons','waitrose') and r.n % 3 = 0
            then greatest(20,round((r.base + (r.n % 11)*17)*rf.factor*0.88)::int) end,
       not (r.n % 23 = 0 and rf.id in ('aldi','lidl'))
from ranked r cross join retailer_factor rf;

create index catalogue_products_category_idx on public.catalogue_products(category);
create index retailer_offers_product_id_idx on public.retailer_offers(product_id);
create index retailer_offers_retailer_id_idx on public.retailer_offers(retailer_id);

alter table public.retailers enable row level security;
alter table public.catalogue_products enable row level security;
alter table public.retailer_offers enable row level security;
create policy "catalogue retailers readable" on public.retailers for select to anon, authenticated using (true);
create policy "catalogue products readable" on public.catalogue_products for select to anon, authenticated using (true);
create policy "catalogue offers readable" on public.retailer_offers for select to anon, authenticated using (true);
grant select on public.retailers, public.catalogue_products, public.retailer_offers to anon, authenticated;
