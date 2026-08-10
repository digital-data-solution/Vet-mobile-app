/**
 * clinicalOptions.ts — broad predefined option lists so staff pick from a
 * dropdown instead of typing. Every list is intentionally wide and ends with
 * "Other" so a clinic can still enter something bespoke. Shared across the
 * clinical/practice forms. Keep these lists broad — the clinic uses only what
 * applies to them.
 */

// ── Species (very broad: companion, exotic, farm, avian, aquatic) ────────────
export const SPECIES = [
  'Dog', 'Cat', 'Rabbit', 'Guinea Pig', 'Hamster', 'Ferret', 'Rat', 'Mouse', 'Chinchilla', 'Hedgehog',
  'Parrot', 'Budgie', 'Canary', 'Pigeon', 'Chicken', 'Duck', 'Goose', 'Turkey', 'Ostrich',
  'Cow', 'Bull', 'Goat', 'Sheep', 'Pig', 'Horse', 'Donkey', 'Camel', 'Buffalo',
  'Snake', 'Lizard', 'Tortoise', 'Turtle', 'Gecko', 'Iguana', 'Chameleon',
  'Fish', 'Frog', 'Bee (hive)', 'Snail',
  'Monkey', 'Falcon', 'Hawk', 'Owl',
  'Other',
];

// ── Common breeds per species (partial, broad; "Other" always available) ─────
export const BREEDS: Record<string, string[]> = {
  Dog: ['Mixed / Local', 'German Shepherd', 'Rottweiler', 'Boerboel', 'Caucasian Shepherd', 'Pitbull', 'Bulldog', 'Labrador', 'Golden Retriever', 'Poodle', 'Chihuahua', 'Lhasa Apso', 'Maltese', 'Shih Tzu', 'Doberman', 'Great Dane', 'Husky', 'Beagle', 'Cocker Spaniel', 'Dachshund', 'Pug', 'Terrier', 'Other'],
  Cat: ['Mixed / Local', 'Domestic Shorthair', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Bengal', 'Sphynx', 'Ragdoll', 'Scottish Fold', 'Other'],
  Cow: ['White Fulani', 'Sokoto Gudali', 'Red Bororo', 'Holstein Friesian', 'Jersey', 'Brahman', 'Angus', 'N’Dama', 'Other'],
  Goat: ['West African Dwarf', 'Red Sokoto', 'Sahel', 'Boer', 'Kalahari', 'Saanen', 'Other'],
  Sheep: ['Yankasa', 'Balami', 'Uda', 'West African Dwarf', 'Merino', 'Dorper', 'Other'],
  Horse: ['Arabian', 'Thoroughbred', 'Local', 'Other'],
  Chicken: ['Broiler', 'Layer', 'Cockerel', 'Noiler', 'Local / Free-range', 'Kuroiler', 'Other'],
  Parrot: ['African Grey', 'Macaw', 'Cockatiel', 'Lovebird', 'Amazon', 'Other'],
  Rabbit: ['New Zealand White', 'California', 'Dutch', 'Lop', 'Local', 'Other'],
};

// ── Sex ──────────────────────────────────────────────────────────────────────
export const SEX = ['Male', 'Female', 'Male (neutered)', 'Female (spayed)', 'Unknown'];

// ── Broad clinical procedure categories (imaging → end-of-life → other) ──────
export const PROCEDURE_CATEGORIES = [
  // Imaging & diagnostics
  'X-ray / Radiology', 'Ultrasound / Scan', 'CT Scan', 'MRI', 'Endoscopy', 'ECG / Cardiology', 'Blood Pressure',
  // Dental
  'Dental — Scaling', 'Dental — Extraction', 'Dental — Check',
  // Preventive
  'Deworming', 'Parasite / Flea / Tick Control', 'Microchipping', 'Health Certificate', 'Travel / Export Certificate', 'Nutrition / Diet Consult',
  // Common procedures
  'Wound Care / Dressing', 'Bandage / Cast / Splint', 'Ear Cleaning', 'Anal Gland Expression', 'Nail Trim (medical)', 'Injection / IM', 'IV Fluid Therapy', 'Blood Transfusion', 'Catheterization', 'Biopsy', 'Abscess Drainage', 'Suturing',
  // Therapy & rehab
  'Physiotherapy / Rehab', 'Hydrotherapy', 'Acupuncture',
  // Reproduction
  'Pregnancy Check', 'Artificial Insemination', 'Whelping / Kidding / Calving Assistance', 'Semen Collection',
  // Consults & visits
  'Consultation / Examination', 'Emergency / Triage', 'Teleconsult / Video', 'Home Visit', 'Farm Visit', 'Behaviour Consult', 'Second Opinion / Referral',
  // End of life
  'Euthanasia', 'Cremation / Disposal', 'Post-mortem / Necropsy',
  'Other',
];

// ── Surgery types (broad) ────────────────────────────────────────────────────
export const SURGERY_TYPES = [
  'Spay (OVH)', 'Neuter / Castration', 'Caesarean Section', 'Cystotomy (bladder stones)', 'Enterotomy / Foreign Body',
  'Mass / Tumour Removal', 'Amputation', 'Fracture Repair / Orthopaedic', 'Wound Repair / Laceration', 'Hernia Repair',
  'Dental Surgery', 'Eye Surgery / Enucleation', 'Ear (Aural) Surgery', 'Pyometra Surgery', 'Exploratory Laparotomy',
  'Skin Graft', 'Dewclaw Removal', 'Cherry Eye Repair', 'Other',
];

export const ANAESTHESIA_TYPES = [
  'General (inhalant / isoflurane)', 'General (injectable)', 'Ketamine + Xylazine', 'Ketamine + Diazepam',
  'Propofol', 'Local / Regional', 'Sedation only', 'Epidural', 'None', 'Other',
];

export const SURGERY_OUTCOMES = ['Successful', 'Complication', 'Deceased', 'Ongoing / Recovering', 'Other'];

// ── Grooming services (broad) ────────────────────────────────────────────────
export const GROOMING_SERVICES = [
  'Bath & Brush', 'Full Groom', 'Haircut / Trim', 'De-shedding', 'Nail Trim', 'Ear Cleaning',
  'Teeth Brushing', 'Anal Gland Expression', 'Flea / Tick Bath', 'De-matting', 'Puppy / Kitten First Groom',
  'Show Groom', 'Hand Stripping', 'Paw / Pad Care', 'Full Spa Package', 'Other',
];

// ── Medication classes + common vet drugs (for treatment/dispensing dropdowns)
export const MEDICATION_CLASSES = [
  'Antibiotic', 'Antifungal', 'Antiviral', 'Antiparasitic (Dewormer)', 'Ectoparasiticide (Flea/Tick)',
  'Anti-inflammatory (NSAID)', 'Steroid / Corticosteroid', 'Analgesic / Painkiller', 'Anaesthetic', 'Sedative',
  'Vaccine', 'Antihistamine', 'Fluid / Electrolyte', 'Vitamin / Supplement', 'Hormone', 'Cardiac',
  'Gastrointestinal', 'Respiratory', 'Ophthalmic (Eye)', 'Dermatological (Skin)', 'Diuretic', 'Anticonvulsant', 'Other',
];

export const COMMON_MEDICATIONS = [
  'Amoxicillin', 'Amoxicillin-Clavulanate', 'Oxytetracycline', 'Enrofloxacin', 'Penicillin', 'Gentamicin',
  'Metronidazole', 'Sulfadimidine', 'Tylosin', 'Ceftriaxone', 'Doxycycline',
  'Ivermectin', 'Albendazole', 'Fenbendazole', 'Praziquantel', 'Pyrantel', 'Levamisole',
  'Meloxicam', 'Carprofen', 'Ketoprofen', 'Flunixin', 'Dexamethasone', 'Prednisolone',
  'Tramadol', 'Buprenorphine', 'Ketamine', 'Xylazine', 'Atropine', 'Diazepam',
  'Multivitamin', 'Calcium Borogluconate', 'Iron Dextran', 'Vitamin B Complex', 'Dextrose', 'Normal Saline',
  'Other',
];

export const MEDICATION_ROUTES = ['Oral (PO)', 'Intramuscular (IM)', 'Intravenous (IV)', 'Subcutaneous (SC)', 'Topical', 'Eye (Ophthalmic)', 'Ear (Otic)', 'Intranasal', 'Rectal', 'Other'];

// ── Common vaccines (broad, multi-species) ───────────────────────────────────
export const VACCINES = [
  'Rabies', 'DHPPi (Dog)', 'DHPPiL (Dog + Lepto)', 'Parvovirus', 'Distemper', 'Kennel Cough (Bordetella)',
  'Feline Trichat (FVRCP)', 'FeLV (Feline Leukaemia)',
  'Newcastle Disease (Poultry)', 'Gumboro (IBD)', 'Fowl Pox', 'Marek’s Disease',
  'PPR (Small Ruminants)', 'CBPP (Cattle)', 'Anthrax', 'Blackleg', 'Brucellosis', 'Foot & Mouth Disease',
  'Other',
];

// ── Payment methods (POS) ────────────────────────────────────────────────────
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card / POS' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'credit', label: 'Credit / Pay Later' },
];
