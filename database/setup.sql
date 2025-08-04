DROP DATABASE IF EXISTS conference_portal;
CREATE DATABASE conference_portal;
USE conference_portal;

-- Conferences table
CREATE TABLE IF NOT EXISTS conferences (
  conference_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Halls table
CREATE TABLE IF NOT EXISTS halls (
  hall_id INT PRIMARY KEY AUTO_INCREMENT,
  conference_id INT NOT NULL,
  hall_name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  location VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conference_id) REFERENCES conferences(conference_id) ON DELETE CASCADE
);

-- Speakers table
CREATE TABLE IF NOT EXISTS speakers (
  speaker_id INT PRIMARY KEY AUTO_INCREMENT,
  speaker_code VARCHAR(10) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  title VARCHAR(300),
  bio TEXT,
  profile_image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
  slot_id INT PRIMARY KEY AUTO_INCREMENT,
  conference_id INT NOT NULL,
  day_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_name VARCHAR(150),
  slot_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conference_id) REFERENCES conferences(conference_id)
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedules (
  schedule_id INT PRIMARY KEY AUTO_INCREMENT,
  conference_id INT NOT NULL,
  speaker_id INT NOT NULL,
  hall_id INT NOT NULL,
  slot_id INT NOT NULL,
  session_title VARCHAR(300),
  session_description TEXT,
  status ENUM('confirmed', 'pending', 'cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conference_id) REFERENCES conferences(conference_id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES speakers(speaker_id) ON DELETE CASCADE,
  FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE,
  FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id) ON DELETE CASCADE,
  UNIQUE KEY unique_schedule (hall_id, slot_id)
);

-- Insert sample conference
INSERT INTO conferences (name, start_date, end_date, total_days, description) VALUES
('Tech Innovation Summit 2025', '2025-03-15', '2025-03-18', 4, 'Annual technology conference focusing on AI, Cloud, and Digital Transformation');

-- Insert sample halls
INSERT INTO halls (conference_id, hall_name, capacity, location) VALUES
(1, 'Hall A', 500, 'Ground Floor - East Wing'),
(1, 'Hall B', 300, 'Ground Floor - West Wing'),
(1, 'Hall C', 200, 'First Floor - North'),
(1, 'Hall D', 150, 'First Floor - South');

-- Insert sample speakers
INSERT INTO speakers (speaker_code, full_name, email, phone, title, bio) VALUES
('SP001', 'Dr. John Smith', 'john.smith@email.com', '+91-9876543210', 'AI & Machine Learning Expert', 'Leading AI researcher with 15+ years experience in deep learning and neural networks.'),
('SP002', 'Mary Johnson', 'mary.johnson@email.com', '+91-9876543211', 'Cloud Architecture Specialist', 'Senior cloud architect helping enterprises migrate to modern cloud infrastructure.'),
('SP003', 'Robert Brown', 'robert.brown@email.com', '+91-9876543212', 'Cybersecurity Consultant', 'Former government cybersecurity analyst now consulting for Fortune 500 companies.'),
('SP004', 'Sarah Davis', 'sarah.davis@email.com', '+91-9876543213', 'Digital Transformation Leader', 'Driving digital innovation and transformation strategies across multiple industries.'),
('SP005', 'David Wilson', 'david.wilson@email.com', '+91-9876543214', 'DevOps & Automation Expert', 'Specializes in CI/CD pipelines and infrastructure automation.'),
('SP006', 'Lisa Chen', 'lisa.chen@email.com', '+91-9876543215', 'UX Design Director', 'Award-winning designer creating intuitive user experiences for global products.'),
('SP007', 'Mike Garcia', 'mike.garcia@email.com', '+91-9876543216', 'Blockchain Developer', 'Building decentralized applications and smart contract solutions.'),
('SP008', 'Anna Martinez', 'anna.martinez@email.com', '+91-9876543217', 'Data Science Manager', 'Leading data science teams in extracting business insights from big data.');

INSERT INTO speakers (speaker_code, full_name, email, phone, title, bio) VALUES
('SP009', 'Priya Sharma', 'priya.sharma@email.com', '+91-9876543218', 'IoT Solutions Architect', 'Expert in smart devices and IoT ecosystems.'),
('SP010', 'Rahul Mehra', 'rahul.mehra@email.com', '+91-9876543219', 'Mobile App Developer', 'Building scalable mobile apps for startups and enterprises.'),
('SP011', 'Emily Clark', 'emily.clark@email.com', '+91-9876543220', 'AI Ethics Researcher', 'Researching ethical implications of artificial intelligence.'),
('SP012', 'Carlos Rivera', 'carlos.rivera@email.com', '+91-9876543221', 'Cloud Security Analyst', 'Specialist in securing cloud infrastructure.'),
('SP013', 'Sofia Rossi', 'sofia.rossi@email.com', '+91-9876543222', 'Agile Coach', 'Helping teams adopt agile methodologies.'),
('SP014', 'Tom Lee', 'tom.lee@email.com', '+91-9876543223', 'Full Stack Developer', 'Experienced in MERN and LAMP stacks.'),
('SP015', 'Yuki Tanaka', 'yuki.tanaka@email.com', '+91-9876543224', 'Robotics Engineer', 'Designing and building autonomous robots.'),
('SP016', 'Fatima Al-Farsi', 'fatima.alfarsi@email.com', '+91-9876543225', 'Big Data Analyst', 'Turning massive datasets into actionable insights.');

-- Insert time slots for 4 days
INSERT INTO time_slots (conference_id, day_number, start_time, end_time, slot_name, slot_order) VALUES
-- Day 1
(1, 1, '10:00:00', '11:00:00', 'Opening Keynote', 1),
(1, 1, '11:30:00', '12:30:00', 'Morning Technical Session', 2),
(1, 1, '14:00:00', '15:00:00', 'Afternoon Workshop', 3),
(1, 1, '15:30:00', '16:30:00', 'Panel Discussion', 4),
-- Day 2
(1, 2, '10:00:00', '11:00:00', 'Day 2 Keynote', 5),
(1, 2, '11:30:00', '12:30:00', 'Deep Dive Session 1', 6),
(1, 2, '14:00:00', '15:00:00', 'Deep Dive Session 2', 7),
(1, 2, '15:30:00', '16:30:00', 'Industry Roundtable', 8),
-- Day 3
(1, 3, '10:00:00', '11:00:00', 'Innovation Showcase', 9),
(1, 3, '11:30:00', '12:30:00', 'Startup Presentations', 10),
(1, 3, '14:00:00', '15:00:00', 'Technology Trends', 11),
(1, 3, '15:30:00', '16:30:00', 'Networking Session', 12),
-- Day 4
(1, 4, '10:00:00', '11:00:00', 'Future Technologies', 13),
(1, 4, '11:30:00', '12:30:00', 'Best Practices', 14),
(1, 4, '14:00:00', '15:00:00', 'Implementation Workshop', 15),
(1, 4, '15:30:00', '17:00:00', 'Closing Ceremony', 16);

-- Insert sample schedules
INSERT INTO schedules (conference_id, speaker_id, hall_id, slot_id, session_title) VALUES
-- Day 1
(1, 1, 1, 1, 'The Future of Artificial Intelligence'),
(1, 2, 2, 1, 'Cloud Computing Revolution'),
(1, 3, 3, 1, 'Cybersecurity in Digital Age'),
(1, 4, 4, 1, 'Digital Transformation Strategies'),

(1, 5, 1, 2, 'DevOps Best Practices'),
(1, 6, 2, 2, 'User Experience Design Principles'),
(1, 7, 3, 2, 'Blockchain Applications'),
(1, 8, 4, 2, 'Data Science in Business'),

-- Day 2
(1, 2, 1, 5, 'Advanced Cloud Architectures'),
(1, 3, 2, 5, 'Enterprise Security Frameworks'),
(1, 4, 3, 5, 'Change Management in Digital Era'),
(1, 1, 4, 5, 'Machine Learning Algorithms'),
(1, 6, 1, 6, 'Design Thinking Workshop'),
(1, 7, 2, 6, 'Smart Contracts Development'),
(1, 8, 3, 6, 'Predictive Analytics'),
(1, 5, 4, 6, 'Automated Testing Strategies'),
(1, 9, 1, 9, 'IoT for Smart Cities'),
(1, 10, 2, 9, 'Building Mobile Apps at Scale'),
(1, 11, 3, 9, 'Ethics in AI: Challenges and Solutions'),
(1, 12, 4, 9, 'Cloud Security Best Practices'),
(1, 13, 1, 10, 'Agile Transformation Stories'),
(1, 14, 2, 10, 'Modern Full Stack Development'),
(1, 15, 3, 10, 'Robotics in Industry 4.0'),
(1, 16, 4, 10, 'Big Data for Business Growth'),
(1, 9, 1, 13, 'IoT Security Fundamentals'),
(1, 10, 2, 13, 'Cross-Platform Mobile Development'),
(1, 11, 3, 13, 'Responsible AI Deployment'),
(1, 12, 4, 13, 'Securing Multi-Cloud Environments'),
(1, 13, 1, 14, 'Scaling Agile in Large Organizations'),
(1, 14, 2, 14, 'Serverless Architectures'),
(1, 15, 3, 14, 'Robotics for Healthcare'),
(1, 16, 4, 14, 'Data Visualization Techniques');

