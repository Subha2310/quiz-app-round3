-- ===== Add options column if it doesn't exist =====
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='questions' AND column_name='options'
    ) THEN
        ALTER TABLE questions
        ADD COLUMN options text NOT NULL DEFAULT '[]';
    END IF;
END$$;

-- ===== Insert all 20 questions =====
INSERT INTO questions (question, options, correct_answer) VALUES
('In Object-Oriented Programming, what is an object?',
 '["A variable that stores numbers","A function inside a class","A collection of classes","A real-world entity having state and behavior"]',
 'A real-world entity having state and behavior'),

('Which OOP concept allows a class to use the properties and methods of another class?',
 '["Encapsulation","Inheritance","Polymorphism","Abstraction"]',
 'Inheritance'),

('Which OOP concept focuses on hiding the internal details and showing only the necessary features?',
 '["Abstraction","Encapsulation","Polymorphism","Inheritance"]',
 'Abstraction'),

('Which OOP concept means ''wrapping up data and methods into a single unit''?',
 '["Abstraction","Polymorphism","Encapsulation","Inheritance"]',
 'Encapsulation'),

('Which OOP concept allows the same operation to behave differently on different objects?',
 '["Abstraction","Inheritance","Encapsulation","Polymorphism"]',
 'Polymorphism'),

('Which of the following is responsible for managing the database and controlling user access?',
 '["Data Architect","System Engineer","Database Administrator (DBA)","Information Security Analyst"]',
 'Database Administrator (DBA)'),

('Which of the following is used to uniquely identify a record in a table?',
 '["Composite Key","Candidate Key","Primary Key","Foreign Key"]',
 'Primary Key'),

('Which of the following is not a type of database model?',
 '["Hierarchical Model","Network Model","Relational Model","Object-Oriented Model"]',
 'Object-Oriented Model'),

('Which language is used to query and manipulate data in a database?',
 '["SQL","Python","PL/SQL","T-SQL"]',
 'SQL'),

('What is the purpose of normalization in a database?',
 '["To increase duplication","To speed up hardware","To reduce data redundancy","To store data randomly"]',
 'To reduce data redundancy'),

('Which data structure is used for implementing recursion?',
 '["Stack","Array","Queue","List"]',
 'Stack'),

('Which of the following is a linear data structure?',
 '["Array","Graph","None","Tree"]',
 'Array'),

('Which of the following is not the type of queue?',
 '["Priority queue","Ordinary queue","Circular queue","Single ended queue"]',
 'Single ended queue'),

('The _____________ algorithm works by repeatedly scanning through the list, comparing adjacent elements, and swapping them if they are in the wrong order.',
 '["Bubble sort","Insertion Sort","Merge Sort","Selection sort"]',
 'Bubble sort'),

('A __________ is a list of elements in which items are always inserted at one end and deleted from the other end.',
 '["Queue","Linked List","Stack","Array"]',
 'Queue'),

('Who is known as the father of cyber security?',
 '["Bob Thomas","Dennis Ritchie","Guido van Rossum","Bjarne Stroustrup"]',
 'Bob Thomas'),

('--------------- is the code injecting method used for attacking the database of a system or website.',
 '["XML injection","Malicious code injection","SQL injection","HTML injection"]',
 'SQL injection'),

('-------------- platforms are used for safety and protection of information in the cloud.',
 '["OneDrive","AWS","Cloud Security Protocols","Cloud Workload Protection Platforms"]',
 'Cloud Workload Protection Platforms'),

('HTTPS is abbreviated as --------------',
 '["Hyperlinked Text Transfer Protocol Secured","Secured Hyper Text Transfer Protocol","Hypertexts Transfer Protocol Secured","Hyper Text Transfer Protocol Secure"]',
 'Hyper Text Transfer Protocol Secure'),

('Why do we use cyber security?',
 '["All of the above","Protecting critical infrastructure from disruption","Safeguarding operations","Protecting sensitive information from theft and damage"]',
 'All of the above');

