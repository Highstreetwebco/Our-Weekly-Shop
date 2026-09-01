-- Compare a test basket across Tesco, Sainsbury's and Morrisons.
alter table public.shopping_list_items
  add column catalogue_product_id uuid references public.catalogue_products(id) on delete set null,
  add column quantity integer not null default 1 check (quantity > 0 and quantity <= 100);
create index shopping_list_items_catalogue_product_id_idx on public.shopping_list_items(catalogue_product_id);

create function public.compare_test_basket(basket jsonb)
returns table (
  retailer_id text,
  retailer_name text,
  requested_lines bigint,
  matched_lines bigint,
  normal_total_pence bigint,
  loyalty_total_pence bigint,
  unavailable_lines bigint
)
language sql stable security invoker set search_path = '' as $$
  with requested as (
    select (line->>'product_id')::uuid as product_id,
           greatest(1, least(100, coalesce((line->>'quantity')::integer, 1))) as quantity
    from jsonb_array_elements(basket) line
  ), selected_retailers as (
    select * from public.retailers where id in ('tesco','sainsburys','morrisons')
  )
  select r.id, r.name,
         (select count(*) from requested),
         count(o.product_id) filter (where o.available),
         coalesce(sum(o.price_pence * q.quantity) filter (where o.available),0)::bigint,
         coalesce(sum(coalesce(o.loyalty_price_pence,o.price_pence) * q.quantity) filter (where o.available),0)::bigint,
         count(*) filter (where o.product_id is null or not o.available)
  from selected_retailers r
  cross join requested q
  left join public.retailer_offers o on o.retailer_id=r.id and o.product_id=q.product_id
  group by r.id,r.name
  order by coalesce(sum(coalesce(o.loyalty_price_pence,o.price_pence) * q.quantity) filter (where o.available),0);
$$;
revoke all on function public.compare_test_basket(jsonb) from public;
grant execute on function public.compare_test_basket(jsonb) to anon, authenticated;
