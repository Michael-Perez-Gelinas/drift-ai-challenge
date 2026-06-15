-- locations: one record per day the truck is out
create table locations (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  address text not null,
  lat float,
  lng float,
  note text,
  is_open boolean default true,
  created_at timestamptz default now()
);

-- menu_items: owner can add, edit, remove, and toggle sold out
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null,
  category text,
  is_available boolean default true,
  is_sold_out boolean default false,
  image_url text,
  sort_order integer default 0
);

-- RLS: public read, no direct client writes
alter table locations enable row level security;
alter table menu_items enable row level security;

create policy "Public read locations"
  on locations for select
  to anon
  using (true);

create policy "Public read menu_items"
  on menu_items for select
  to anon
  using (true);

-- Seed menu data
insert into menu_items (name, description, price, category, sort_order) values
  ('Al Pastor Taco',      'Marinated pork, pineapple, cilantro, onion',         450, 'Tacos',  1),
  ('Carnitas Taco',       'Slow-braised pork, salsa verde, pickled onion',       450, 'Tacos',  2),
  ('Birria Taco',         'Braised beef, consommé for dipping, oaxacan cheese',  550, 'Tacos',  3),
  ('Veggie Black Bean',   'Seasoned black beans, roasted peppers, cotija',       400, 'Tacos',  4),
  ('Elote',               'Grilled corn, crema, cotija, chili lime',             350, 'Sides',  5),
  ('Chips + Salsa',       'House-made tortilla chips, roasted tomato salsa',     300, 'Sides',  6),
  ('Guac + Chips',        'Fresh guacamole, house chips',                        450, 'Sides',  7),
  ('Horchata',            'House-made rice milk, cinnamon, vanilla',             350, 'Drinks', 8),
  ('Jarritos',            'Assorted flavors — ask what we have today',           250, 'Drinks', 9),
  ('Agua Fresca',         'Rotating seasonal fruit water',                       300, 'Drinks', 10),
  ('Extra Tortilla',      'Two house corn tortillas',                            100, 'Extras', 11),
  ('Sour Cream',          'A little extra',                                      100, 'Extras', 12);
