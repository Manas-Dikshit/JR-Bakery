
CREATE POLICY "bills_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bills');
CREATE POLICY "bills_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bills' AND public.is_staff(auth.uid()));
CREATE POLICY "bills_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'bills' AND public.is_staff(auth.uid()));
CREATE POLICY "bills_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bills' AND public.has_role(auth.uid(), 'super_admin'));
