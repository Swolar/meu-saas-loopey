-- Add theme_color column to sites table
alter table sites add column if not exists theme_color text default '#006fee';
