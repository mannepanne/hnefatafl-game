
-- Create storage bucket for piece textures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('piece-textures', 'piece-textures', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']);

-- Public read access for everyone (textures need to load in the game)
CREATE POLICY "Public read piece textures"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'piece-textures');

-- Authenticated users can upload (will further gate in UI to admin only)
CREATE POLICY "Authenticated upload piece textures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'piece-textures');

-- Authenticated users can update (upsert)
CREATE POLICY "Authenticated update piece textures"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'piece-textures');

-- Authenticated users can delete
CREATE POLICY "Authenticated delete piece textures"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'piece-textures');

