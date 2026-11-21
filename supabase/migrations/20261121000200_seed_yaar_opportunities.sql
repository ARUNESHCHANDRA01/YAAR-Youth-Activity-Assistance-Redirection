-- Seed the supplied Y.A.A.R. opportunity catalog under the existing project organization.
-- The migration is idempotent by organization, partner name, title and activity date.

alter table public.opportunities
  add column if not exists partner_name text,
  add column if not exists featured boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = 'c44da637-b173-4b90-a52b-c128282d248f'::uuid
      and role = 'administrator'
  ) then
    raise exception 'Y.A.A.R. administrator c44da637-b173-4b90-a52b-c128282d248f was not found';
  end if;

  if not exists (
    select 1 from public.organizations
    where id = '256b2371-ca36-41b9-88b3-d5f3421e7a21'::uuid
  ) and not exists (
    select 1 from public.organizations
    where owner_id = 'c44da637-b173-4b90-a52b-c128282d248f'::uuid
  ) then
    insert into public.organizations (id, owner_id, name, description, location, verified)
    values (
      '256b2371-ca36-41b9-88b3-d5f3421e7a21'::uuid,
      'c44da637-b173-4b90-a52b-c128282d248f'::uuid,
      'Y.A.A.R. Project Organization',
      'Organization responsible for the Y.A.A.R. opportunity catalog.',
      'India',
      true
    );
  end if;
end;
$$;

with seed as (
  select *
  from jsonb_to_recordset($seed$
[
  {
    "partner_name": "Digital Saathi Foundation",
    "title": "Community Digital Literacy Drive",
    "description": "Teach basic smartphone usage, online payments, internet browsing and digital safety to senior citizens and underserved adults in local communities.",
    "category": "Education",
    "location": "Sector 62, Noida, Uttar Pradesh",
    "activity_date": "2026-12-05",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-02",
    "required_skills": [
      "Basic computer knowledge",
      "communication",
      "patience"
    ],
    "volunteer_capacity": 15,
    "featured": true
  },
  {
    "partner_name": "Blue Earth Collective",
    "title": "Urban Lake Clean-Up Mission",
    "description": "Participate in a lake clean-up initiative involving plastic collection, waste segregation and public awareness activities to protect urban water bodies.",
    "category": "Environment",
    "location": "Sanjay Lake, Delhi",
    "activity_date": "2026-12-06",
    "time_commitment": "5 hours",
    "application_deadline": "2026-12-04",
    "required_skills": [
      "Physical fitness",
      "teamwork",
      "environmental awareness"
    ],
    "volunteer_capacity": 30,
    "featured": true
  },
  {
    "partner_name": "Udaan Learning Circle",
    "title": "Free Mathematics Mentorship",
    "description": "Help students from economically disadvantaged backgrounds understand fundamental mathematics through interactive sessions and practice exercises.",
    "category": "Education",
    "location": "Lajpat Nagar, New Delhi",
    "activity_date": "2026-12-08",
    "time_commitment": "2 hours per week for 4 weeks",
    "application_deadline": "2026-12-05",
    "required_skills": [
      "Mathematics",
      "teaching",
      "communication"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "Paws and Hope Initiative",
    "title": "Animal Shelter Care Assistance",
    "description": "Assist animal shelter workers with feeding rescued dogs, cleaning animal enclosures, organizing supplies and helping with basic animal care.",
    "category": "Animal Welfare",
    "location": "Greater Noida, Uttar Pradesh",
    "activity_date": "2026-12-10",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-07",
    "required_skills": [
      "Compassion towards animals",
      "responsibility",
      "teamwork"
    ],
    "volunteer_capacity": 10,
    "featured": true
  },
  {
    "partner_name": "Sakhi Suraksha Network",
    "title": "Women's Self-Defense Awareness Workshop",
    "description": "Support a community awareness workshop covering personal safety, emergency response, self-defense fundamentals and access to safety resources.",
    "category": "Community",
    "location": "Indirapuram, Ghaziabad, Uttar Pradesh",
    "activity_date": "2026-12-12",
    "time_commitment": "3 hours",
    "application_deadline": "2026-12-09",
    "required_skills": [
      "Communication",
      "event coordination",
      "awareness of personal safety"
    ],
    "volunteer_capacity": 20,
    "featured": true
  },
  {
    "partner_name": "LifeDrop Community",
    "title": "Blood Donation Awareness Campaign",
    "description": "Help organize a blood donation awareness campaign, manage registration desks, distribute educational materials and coordinate donor assistance.",
    "category": "Health",
    "location": "Connaught Place, New Delhi",
    "activity_date": "2026-12-13",
    "time_commitment": "5 hours",
    "application_deadline": "2026-12-10",
    "required_skills": [
      "Organization",
      "communication",
      "basic event management"
    ],
    "volunteer_capacity": 18,
    "featured": false
  },
  {
    "partner_name": "CodeForChange India",
    "title": "Rural Website Development Project",
    "description": "Collaborate with a small team to develop a simple informational website for a rural educational institution, including its programs and admission information.",
    "category": "Technology",
    "location": "Remote / Online",
    "activity_date": "2026-12-15",
    "time_commitment": "6 hours per week for 2 weeks",
    "application_deadline": "2026-12-11",
    "required_skills": [
      "HTML",
      "CSS",
      "JavaScript",
      "basic web development"
    ],
    "volunteer_capacity": 8,
    "featured": true
  },
  {
    "partner_name": "Warm Hearts Mission",
    "title": "Winter Clothing Distribution",
    "description": "Collect, sort and distribute winter clothing and blankets to homeless individuals and families experiencing economic hardship.",
    "category": "Community",
    "location": "Old Delhi, New Delhi",
    "activity_date": "2026-12-16",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-14",
    "required_skills": [
      "Teamwork",
      "organization",
      "communication"
    ],
    "volunteer_capacity": 25,
    "featured": true
  },
  {
    "partner_name": "GreenRoots Society",
    "title": "Urban Tree Plantation Initiative",
    "description": "Assist in planting native tree species, preparing planting areas and educating residents about the importance of urban green spaces.",
    "category": "Environment",
    "location": "Sector 150, Noida, Uttar Pradesh",
    "activity_date": "2026-12-19",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-16",
    "required_skills": [
      "Environmental awareness",
      "teamwork",
      "physical activity"
    ],
    "volunteer_capacity": 35,
    "featured": false
  },
  {
    "partner_name": "Mindful Youth Collective",
    "title": "Mental Health Awareness Outreach",
    "description": "Help conduct a youth-focused awareness event promoting emotional well-being, healthy social connections and awareness of available mental health resources. Volunteers will assist with event operations, not provide clinical counselling.",
    "category": "Health",
    "location": "Greater Noida, Uttar Pradesh",
    "activity_date": "2026-12-20",
    "time_commitment": "3 hours",
    "application_deadline": "2026-12-17",
    "required_skills": [
      "Empathy",
      "communication",
      "event management"
    ],
    "volunteer_capacity": 15,
    "featured": true
  },
  {
    "partner_name": "AccessTech Foundation",
    "title": "Assistive Technology for Accessibility",
    "description": "Test accessibility features of websites and mobile applications, identify usability barriers and document recommendations for improving digital access for people with disabilities.",
    "category": "Technology",
    "location": "Remote / Online",
    "activity_date": "2026-12-21",
    "time_commitment": "5 hours",
    "application_deadline": "2026-12-18",
    "required_skills": [
      "Basic technology knowledge",
      "attention to detail",
      "documentation"
    ],
    "volunteer_capacity": 10,
    "featured": false
  },
  {
    "partner_name": "Itihaas Preservation Circle",
    "title": "Heritage Documentation Walk",
    "description": "Document historical buildings, architectural details and local heritage stories through photography, research and structured documentation.",
    "category": "Other",
    "location": "Shahjahanabad, Old Delhi",
    "activity_date": "2026-12-22",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-19",
    "required_skills": [
      "Photography",
      "research",
      "observation",
      "writing"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "SpeakUp Community Project",
    "title": "Free Spoken English Sessions",
    "description": "Conduct conversational English practice sessions for young job seekers to improve confidence, vocabulary and workplace communication.",
    "category": "Education",
    "location": "Sector 18, Noida, Uttar Pradesh",
    "activity_date": "2026-12-23",
    "time_commitment": "2 hours per week for 3 weeks",
    "application_deadline": "2026-12-20",
    "required_skills": [
      "English fluency",
      "communication",
      "teaching"
    ],
    "volunteer_capacity": 10,
    "featured": false
  },
  {
    "partner_name": "Safe Streets India",
    "title": "Road Safety Awareness Campaign",
    "description": "Help spread awareness about helmet use, pedestrian safety, traffic rules and responsible road behavior through public outreach.",
    "category": "Community",
    "location": "Vaishali, Ghaziabad, Uttar Pradesh",
    "activity_date": "2026-12-24",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-21",
    "required_skills": [
      "Communication",
      "public interaction",
      "teamwork"
    ],
    "volunteer_capacity": 20,
    "featured": false
  },
  {
    "partner_name": "Meals of Hope Foundation",
    "title": "Community Kitchen Assistance",
    "description": "Assist in preparing meal packages, organizing food supplies and distributing nutritious meals to individuals facing food insecurity.",
    "category": "Community",
    "location": "Karol Bagh, New Delhi",
    "activity_date": "2026-12-26",
    "time_commitment": "5 hours",
    "application_deadline": "2026-12-23",
    "required_skills": [
      "Teamwork",
      "hygiene awareness",
      "food handling"
    ],
    "volunteer_capacity": 20,
    "featured": true
  },
  {
    "partner_name": "CyberWise Youth Initiative",
    "title": "Cyber Safety Awareness for Teenagers",
    "description": "Help organize educational sessions on online privacy, cyberbullying, phishing, password security and responsible social media usage.",
    "category": "Technology",
    "location": "Online / Remote",
    "activity_date": "2026-12-27",
    "time_commitment": "3 hours",
    "application_deadline": "2026-12-24",
    "required_skills": [
      "Basic cybersecurity knowledge",
      "presentation",
      "communication"
    ],
    "volunteer_capacity": 15,
    "featured": true
  },
  {
    "partner_name": "OceanWatch Collective",
    "title": "Beach Waste Monitoring Program",
    "description": "Participate in coastal waste collection and record common categories of marine litter to support environmental monitoring and awareness.",
    "category": "Environment",
    "location": "Juhu Beach, Mumbai, Maharashtra",
    "activity_date": "2026-12-28",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-25",
    "required_skills": [
      "Environmental awareness",
      "teamwork",
      "data recording"
    ],
    "volunteer_capacity": 30,
    "featured": false
  },
  {
    "partner_name": "Golden Years Circle",
    "title": "Elderly Companionship Program",
    "description": "Spend time with elderly residents through conversations, recreational activities, reading sessions and assistance with community events.",
    "category": "Community",
    "location": "Jaipur, Rajasthan",
    "activity_date": "2026-12-29",
    "time_commitment": "3 hours",
    "application_deadline": "2026-12-26",
    "required_skills": [
      "Empathy",
      "patience",
      "communication"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "OpenBuild India",
    "title": "Open-Source Software Contribution Drive",
    "description": "Contribute to an open-source community project by resolving beginner-friendly issues, improving documentation and testing software features.",
    "category": "Technology",
    "location": "Remote / Online",
    "activity_date": "2026-12-30",
    "time_commitment": "5 hours per week for 2 weeks",
    "application_deadline": "2026-12-27",
    "required_skills": [
      "Git",
      "GitHub",
      "programming fundamentals"
    ],
    "volunteer_capacity": 10,
    "featured": true
  },
  {
    "partner_name": "Project Ujjwala",
    "title": "Menstrual Health Awareness Initiative",
    "description": "Assist in distributing menstrual hygiene educational materials and organizing awareness discussions about menstrual health and hygiene practices.",
    "category": "Health",
    "location": "Lucknow, Uttar Pradesh",
    "activity_date": "2027-01-02",
    "time_commitment": "4 hours",
    "application_deadline": "2026-12-29",
    "required_skills": [
      "Communication",
      "sensitivity",
      "community engagement"
    ],
    "volunteer_capacity": 15,
    "featured": true
  },
  {
    "partner_name": "MoneyMinds Foundation",
    "title": "Financial Literacy for Young Adults",
    "description": "Help conduct beginner-friendly sessions on budgeting, savings, digital banking, financial scams and responsible money management.",
    "category": "Education",
    "location": "Gurugram, Haryana",
    "activity_date": "2027-01-03",
    "time_commitment": "3 hours",
    "application_deadline": "2026-12-30",
    "required_skills": [
      "Basic financial literacy",
      "presentation",
      "communication"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "PlayForward Foundation",
    "title": "Community Sports Development Day",
    "description": "Organize recreational sports activities for children, including football, badminton, running games and basic fitness exercises.",
    "category": "Community",
    "location": "Dwarka, New Delhi",
    "activity_date": "2027-01-04",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-01",
    "required_skills": [
      "Sports knowledge",
      "teamwork",
      "leadership"
    ],
    "volunteer_capacity": 25,
    "featured": false
  },
  {
    "partner_name": "WildLens Research Collective",
    "title": "Wildlife Photography Documentation",
    "description": "Help document local bird species and wildlife observations through photography and organized field records for educational purposes.",
    "category": "Animal Welfare",
    "location": "Sultanpur National Park, Gurugram, Haryana",
    "activity_date": "2027-01-05",
    "time_commitment": "5 hours",
    "application_deadline": "2027-01-02",
    "required_skills": [
      "Photography",
      "observation",
      "nature awareness"
    ],
    "volunteer_capacity": 8,
    "featured": false
  },
  {
    "partner_name": "FuturePath Mentorship Network",
    "title": "Career Guidance for Government School Students",
    "description": "Share information about higher education, vocational training, competitive examinations and career opportunities with senior school students.",
    "category": "Education",
    "location": "Patna, Bihar",
    "activity_date": "2027-01-06",
    "time_commitment": "3 hours",
    "application_deadline": "2027-01-03",
    "required_skills": [
      "Communication",
      "mentoring",
      "career awareness"
    ],
    "volunteer_capacity": 15,
    "featured": true
  },
  {
    "partner_name": "ZeroWaste Kitchens",
    "title": "Food Waste Reduction Campaign",
    "description": "Work with community food outlets to document food waste, promote responsible food storage and encourage surplus food redistribution through appropriate channels.",
    "category": "Environment",
    "location": "Sector 29, Gurugram, Haryana",
    "activity_date": "2027-01-07",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-04",
    "required_skills": [
      "Organization",
      "data collection",
      "communication"
    ],
    "volunteer_capacity": 15,
    "featured": false
  },
  {
    "partner_name": "Inclusive Voices Network",
    "title": "Sign Language Learning and Inclusion Day",
    "description": "Support an introductory Indian Sign Language awareness event and help participants engage in inclusive communication activities.",
    "category": "Community",
    "location": "Pune, Maharashtra",
    "activity_date": "2027-01-08",
    "time_commitment": "3 hours",
    "application_deadline": "2027-01-05",
    "required_skills": [
      "Communication",
      "inclusivity awareness",
      "event support"
    ],
    "volunteer_capacity": 18,
    "featured": false
  },
  {
    "partner_name": "JalSakhi Research Group",
    "title": "Water Quality Awareness Survey",
    "description": "Assist with community surveys on drinking water access, sanitation practices and awareness of household water conservation.",
    "category": "Environment",
    "location": "Varanasi, Uttar Pradesh",
    "activity_date": "2027-01-09",
    "time_commitment": "5 hours",
    "application_deadline": "2027-01-06",
    "required_skills": [
      "Survey skills",
      "communication",
      "data recording"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "FutureTech Learning Initiative",
    "title": "AI Literacy for Rural Students",
    "description": "Introduce students to basic artificial intelligence concepts, responsible AI usage, practical applications and digital learning tools.",
    "category": "Technology",
    "location": "Remote / Online",
    "activity_date": "2027-01-10",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-07",
    "required_skills": [
      "AI awareness",
      "basic computer skills",
      "teaching"
    ],
    "volunteer_capacity": 10,
    "featured": true
  },
  {
    "partner_name": "PawCare Network",
    "title": "Street Animal First-Response Awareness",
    "description": "Help organize awareness sessions on safe interaction with street animals, responsible feeding and contacting qualified veterinary professionals during emergencies.",
    "category": "Animal Welfare",
    "location": "Bhopal, Madhya Pradesh",
    "activity_date": "2027-01-11",
    "time_commitment": "3 hours",
    "application_deadline": "2027-01-08",
    "required_skills": [
      "Animal welfare awareness",
      "communication",
      "compassion"
    ],
    "volunteer_capacity": 15,
    "featured": false
  },
  {
    "partner_name": "ReadAgain Foundation",
    "title": "Public Library Book Digitization",
    "description": "Help organize library records, catalogue books and digitize selected bibliographic information to improve access to educational resources.",
    "category": "Education",
    "location": "Chandigarh, Punjab/Haryana",
    "activity_date": "2027-01-12",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-09",
    "required_skills": [
      "Computer literacy",
      "typing",
      "organization"
    ],
    "volunteer_capacity": 10,
    "featured": false
  },
  {
    "partner_name": "Resilience India Collective",
    "title": "Disaster Preparedness Awareness Workshop",
    "description": "Support a public workshop introducing disaster preparedness, emergency kits, evacuation awareness and basic response coordination.",
    "category": "Community",
    "location": "Dehradun, Uttarakhand",
    "activity_date": "2027-01-13",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-10",
    "required_skills": [
      "Communication",
      "teamwork",
      "basic emergency awareness"
    ],
    "volunteer_capacity": 20,
    "featured": true
  },
  {
    "partner_name": "SkyWatch Learning Club",
    "title": "Community Astronomy Observation Night",
    "description": "Assist in hosting a public astronomy event with telescope demonstrations, basic constellation identification and introductory space science activities.",
    "category": "Education",
    "location": "Jaipur, Rajasthan",
    "activity_date": "2027-01-14",
    "time_commitment": "3 hours",
    "application_deadline": "2027-01-11",
    "required_skills": [
      "Interest in astronomy",
      "communication",
      "event coordination"
    ],
    "volunteer_capacity": 20,
    "featured": true
  },
  {
    "partner_name": "MobilityForAll Initiative",
    "title": "Accessible Public Transport Survey",
    "description": "Assess accessibility features at selected public transport locations and document barriers faced by elderly commuters and people with disabilities.",
    "category": "Community",
    "location": "Bengaluru, Karnataka",
    "activity_date": "2027-01-15",
    "time_commitment": "5 hours",
    "application_deadline": "2027-01-12",
    "required_skills": [
      "Observation",
      "survey work",
      "documentation"
    ],
    "volunteer_capacity": 12,
    "featured": false
  },
  {
    "partner_name": "KalaSutra Heritage Foundation",
    "title": "Traditional Craft Preservation Project",
    "description": "Help local artisans document traditional crafts, record production processes and promote handmade products through digital storytelling.",
    "category": "Other",
    "location": "Jaipur, Rajasthan",
    "activity_date": "2027-01-16",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-13",
    "required_skills": [
      "Photography",
      "storytelling",
      "social media",
      "cultural awareness"
    ],
    "volunteer_capacity": 10,
    "featured": false
  },
  {
    "partner_name": "HealthySteps Community",
    "title": "Nutrition Awareness for Schoolchildren",
    "description": "Support interactive educational activities about balanced meals, hydration, food hygiene and healthy everyday habits.",
    "category": "Health",
    "location": "Kanpur, Uttar Pradesh",
    "activity_date": "2027-01-17",
    "time_commitment": "3 hours",
    "application_deadline": "2027-01-14",
    "required_skills": [
      "Communication",
      "teaching",
      "basic nutrition awareness"
    ],
    "volunteer_capacity": 15,
    "featured": false
  },
  {
    "partner_name": "Reboot Earth Initiative",
    "title": "E-Waste Collection and Segregation Drive",
    "description": "Organize a neighborhood electronic waste collection campaign, categorize collected items and direct them to authorized recycling channels.",
    "category": "Environment",
    "location": "Sector 50, Noida, Uttar Pradesh",
    "activity_date": "2027-01-18",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-15",
    "required_skills": [
      "Environmental awareness",
      "organization",
      "teamwork"
    ],
    "volunteer_capacity": 25,
    "featured": true
  },
  {
    "partner_name": "HerRise Development Collective",
    "title": "Rural Women Entrepreneurship Mentorship",
    "description": "Assist women-led microbusinesses with basic product photography, digital promotion, pricing awareness and introductory online selling strategies.",
    "category": "Community",
    "location": "Ranchi, Jharkhand",
    "activity_date": "2027-01-19",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-16",
    "required_skills": [
      "Digital marketing",
      "communication",
      "business fundamentals"
    ],
    "volunteer_capacity": 12,
    "featured": true
  },
  {
    "partner_name": "EcoMap Research Foundation",
    "title": "Local Biodiversity Mapping",
    "description": "Record observations of local plants, insects and bird species to contribute to a community biodiversity mapping exercise.",
    "category": "Environment",
    "location": "Mysuru, Karnataka",
    "activity_date": "2027-01-20",
    "time_commitment": "5 hours",
    "application_deadline": "2027-01-17",
    "required_skills": [
      "Observation",
      "nature awareness",
      "data entry"
    ],
    "volunteer_capacity": 15,
    "featured": false
  },
  {
    "partner_name": "RoboReach Foundation",
    "title": "Robotics Demonstration for School Students",
    "description": "Help demonstrate beginner-level robotics projects and introduce school students to sensors, simple circuits and programming concepts.",
    "category": "Technology",
    "location": "Hyderabad, Telangana",
    "activity_date": "2027-01-21",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-18",
    "required_skills": [
      "Basic robotics",
      "electronics",
      "programming",
      "teaching"
    ],
    "volunteer_capacity": 10,
    "featured": true
  },
  {
    "partner_name": "CleanLane Mission",
    "title": "Community Waste Segregation Awareness",
    "description": "Conduct door-to-door awareness activities about wet waste, dry waste, household segregation and responsible disposal practices.",
    "category": "Environment",
    "location": "Ahmedabad, Gujarat",
    "activity_date": "2027-01-22",
    "time_commitment": "4 hours",
    "application_deadline": "2027-01-19",
    "required_skills": [
      "Communication",
      "public interaction",
      "environmental awareness"
    ],
    "volunteer_capacity": 20,
    "featured": false
  },
  {
    "partner_name": "CareerLaunch Youth Network",
    "title": "Resume Building and Interview Preparation",
    "description": "Mentor college students on resume formatting, professional communication, interview preparation and entry-level job applications.",
    "category": "Education",
    "location": "Online / Remote",
    "activity_date": "2027-01-23",
    "time_commitment": "2 hours per week for 2 weeks",
    "application_deadline": "2027-01-20",
    "required_skills": [
      "Resume writing",
      "communication",
      "mentoring"
    ],
    "volunteer_capacity": 10,
    "featured": true
  }
]
$seed$::jsonb) as item(
  partner_name text,
  title text,
  description text,
  category text,
  location text,
  activity_date date,
  time_commitment text,
  application_deadline date,
  required_skills text[],
  volunteer_capacity integer,
  featured boolean
)
)
insert into public.opportunities (
  organization_id,
  created_by,
  partner_name,
  title,
  description,
  category,
  location,
  activity_date,
  time_commitment,
  application_deadline,
  required_skills,
  volunteer_capacity,
  status,
  review_status,
  featured
)
select
  organization.id,
  organization.owner_id,
  seed.partner_name,
  seed.title,
  seed.description,
  seed.category,
  seed.location,
  seed.activity_date,
  seed.time_commitment,
  seed.application_deadline,
  seed.required_skills,
  seed.volunteer_capacity,
  'published',
  'approved',
  seed.featured
from seed
cross join lateral (
  select id, owner_id
  from public.organizations
  where id = '256b2371-ca36-41b9-88b3-d5f3421e7a21'::uuid
     or owner_id = 'c44da637-b173-4b90-a52b-c128282d248f'::uuid
  order by case when id = '256b2371-ca36-41b9-88b3-d5f3421e7a21'::uuid then 0 else 1 end
  limit 1
) organization
where not exists (
  select 1
  from public.opportunities existing
  where existing.organization_id = organization.id
    and existing.partner_name = seed.partner_name
    and existing.title = seed.title
    and existing.activity_date = seed.activity_date
);

