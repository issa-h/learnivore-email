-- Table des impayés (séparée de contacts)
CREATE TABLE IF NOT EXISTS impayes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  first_name text,
  produit text NOT NULL,
  date_inscription text,
  prix_programme integer NOT NULL,
  montant_paye integer NOT NULL,
  montant_du integer NOT NULL,
  lien_paiement text,
  sequence_name text,
  current_step integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paid', 'cancelled')),
  last_email_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Permettre l'accès via service role
ALTER TABLE impayes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on impayes" ON impayes
  FOR ALL USING (true) WITH CHECK (true);
