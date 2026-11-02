#!/usr/bin/env python3
"""
Builds src/data/en/<section>Quiz.en.json (what the app loads for English questions).

Two sources per section:
  1. HAND below (written in English from the start; ids 9001...)
  2. src/data/en/batches/<section>.tsv, translations of the Arabic questions. One line each, tab separated:
         arabicId <TAB> question <TAB> option0 <TAB> option1 <TAB> option2 <TAB> option3 <TAB> explanation
     The options keep the Arabic order, so difficulty, correct answer, emoji, design and category are taken from the Arabic
     file by id. The English question keeps the Arabic id, so a question never changes id between builds (progress is kept).

Usage:  python3 scripts/build_en_quiz.py            # build all
        python3 scripts/build_en_quiz.py dump football 10   # print 10 not-yet-translated Arabic questions per difficulty
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(ROOT, 'src', 'data')
DES=['cards','grid','bubbles','stadium','poster','polaroid','neon','comic']

# (question, [options], correct_index, explanation, category, difficulty)
HAND={}
HAND['football']=('Football Quiz Challenge','⚽',[
("How many players from one team are on the pitch at the same time?",["9","10","11","12"],2,"Each side plays with 11 players, including the goalkeeper.","Rules",1),
("Which colour of card sends a player off the pitch?",["Yellow","Red","Green","Blue"],1,"A red card means the player is sent off.","Rules",1),
("How long is a standard football match, without extra time?",["60 minutes","80 minutes","90 minutes","120 minutes"],2,"Two halves of 45 minutes each.","Rules",1),
("Which country hosted the 2022 World Cup?",["Qatar","Russia","Brazil","Germany"],0,"Qatar hosted the 2022 World Cup, the first one in the Arab world.","World Cup",1),
("Which country won the 2022 World Cup?",["France","Argentina","Croatia","Brazil"],1,"Argentina beat France on penalties after a 3-3 draw.","World Cup",2),
("Which Egyptian forward joined Liverpool in 2017?",["Mohamed Salah","Trezeguet","Mohamed Elneny","Omar Marmoush"],0,"Mohamed Salah moved to Liverpool from Roma in 2017.","Egyptian football",2),
("What is it called when a player scores three goals in one match?",["Hat-trick","Double","Brace","Quadruple"],0,"Three goals by the same player in one match is a hat-trick.","Rules",2),
("Which club plays its home games at Camp Nou?",["Real Madrid","Barcelona","Atletico Madrid","Valencia"],1,"Camp Nou is the home of FC Barcelona.","Clubs",2),
("Which country has won the most men's World Cups?",["Germany","Italy","Brazil","Argentina"],2,"Brazil has won it five times.","World Cup",3),
("Who is the all-time top scorer in men's World Cup history?",["Pelé","Miroslav Klose","Ronaldo Nazário","Gerd Müller"],1,"Miroslav Klose scored 16 World Cup goals.","World Cup",3),
("Which club has won the most Egyptian league titles?",["Zamalek","Al Ahly","Ismaily","Al Masry"],1,"Al Ahly holds the record for Egyptian league titles.","Egyptian football",3),
("Which African nation became the first to reach a World Cup semi-final, in 2022?",["Morocco","Senegal","Ghana","Cameroon"],0,"Morocco reached the semi-finals in Qatar 2022.","World Cup",3),
("In which year was the first men's World Cup played?",["1930","1920","1950","1934"],0,"The first World Cup took place in Uruguay in 1930.","World Cup",4),
("Which country hosted the 2010 World Cup?",["Egypt","South Africa","Brazil","Germany"],1,"South Africa was the first African host.","World Cup",4),
("Which player has won the most Ballon d'Or awards?",["Cristiano Ronaldo","Lionel Messi","Michel Platini","Johan Cruyff"],1,"Lionel Messi has won the Ballon d'Or eight times.","Players",4),
("Which coach led Egypt to three Africa Cup of Nations titles in a row (2006, 2008, 2010)?",["Hassan Shehata","Mahmoud El Gohary","Carlos Queiroz","Hossam Hassan"],0,"Hassan Shehata led the Pharaohs to three consecutive titles.","Egyptian football",4),
("How many times has Egypt won the Africa Cup of Nations?",["5","7","9","10"],1,"Egypt is the record winner with seven titles.","Egyptian football",5),
("Which club did Pelé play for during most of his career?",["Santos","Flamengo","Corinthians","Palmeiras"],0,"Pelé spent almost 20 years at Santos.","Players",5),
("Who scored the famous \"Hand of God\" goal in 1986?",["Diego Maradona","Pelé","Zico","Michel Platini"],0,"Maradona scored it against England in the 1986 World Cup.","World Cup",5),
("Which club won the very first European Cup, in 1956?",["Real Madrid","Benfica","AC Milan","Barcelona"],0,"Real Madrid won the first five European Cups.","Clubs",6),
("Which club has won the CAF Champions League the most times?",["Al Ahly","Zamalek","Ismaily","Al Mokawloon"],0,"Al Ahly is the most successful club in the competition.","Egyptian football",6),
("Which country won the European Championship played in 2021 (Euro 2020)?",["Italy","England","Spain","France"],0,"Italy beat England on penalties at Wembley.","Europe",6),
("Who won the Golden Boot at the 2018 World Cup?",["Harry Kane","Antoine Griezmann","Kylian Mbappé","Romelu Lukaku"],0,"Harry Kane scored six goals in Russia.","World Cup",6),
("Which stadium is nicknamed \"The Theatre of Dreams\"?",["Anfield","Old Trafford","Emirates Stadium","Stamford Bridge"],1,"Old Trafford is the home of Manchester United.","Stadiums",7),
("Who won the Golden Glove at the 2022 World Cup?",["Hugo Lloris","Emiliano Martínez","Yassine Bounou","Dominik Livaković"],1,"Emiliano Martínez was the best goalkeeper of the tournament.","World Cup",7),
("Who scored the fastest goal in World Cup history, after 11 seconds?",["Hakan Şükür","Clint Dempsey","Ronaldo","Miroslav Klose"],0,"Hakan Şükür scored for Turkey in 2002.","World Cup",8),
("Which country won the first World Cup in 1930?",["Uruguay","Argentina","Brazil","Italy"],0,"Uruguay beat Argentina 4-2 in the final.","World Cup",8),
("Who is the only goalkeeper to have won the Ballon d'Or?",["Lev Yashin","Gianluigi Buffon","Manuel Neuer","Oliver Kahn"],0,"Lev Yashin won it in 1963.","Players",8),
("Which team shocked Europe by winning Euro 2004?",["Greece","Portugal","Czech Republic","Netherlands"],0,"Greece beat host Portugal 1-0 in the final.","Europe",9),
("In which season did Leicester City win the Premier League?",["2013–14","2014–15","2015–16","2016–17"],2,"Leicester won at odds of 5000-1.","Clubs",9),
("Which player scored 91 goals in a single calendar year (2012)?",["Lionel Messi","Cristiano Ronaldo","Gerd Müller","Pelé"],0,"Messi broke Gerd Müller's record of 85.","Players",10),
("Who scored the winning goal in the 2010 World Cup final?",["Andrés Iniesta","Xavi","David Villa","Fernando Torres"],0,"Iniesta scored in extra time against the Netherlands.","World Cup",10),
])
HAND['general']=('General Knowledge Challenge','🌍',[
("What is the capital of France?",["Lyon","Paris","Marseille","Nice"],1,"Paris is the capital and largest city of France.","Geography",1),
("Which is the largest planet in the solar system?",["Saturn","Jupiter","Earth","Mars"],1,"Jupiter is more than 300 times the mass of Earth.","Space",1),
("How many continents are there?",["5","6","7","8"],2,"Africa, Antarctica, Asia, Australia/Oceania, Europe, North America and South America.","Geography",1),
("Which is the largest ocean?",["Atlantic","Indian","Pacific","Arctic"],2,"The Pacific covers about a third of the planet.","Geography",1),
("What is the chemical formula of water?",["CO2","H2O","O2","NaCl"],1,"Two hydrogen atoms and one oxygen atom.","Science",2),
("What is the longest river in Africa?",["Congo","Nile","Niger","Zambezi"],1,"The Nile is about 6,650 km long.","Geography",2),
("Which is the largest land animal?",["Giraffe","Rhinoceros","African elephant","Hippopotamus"],2,"The African elephant is the biggest land animal.","Animals",2),
("How many colours are there in a rainbow?",["5","6","7","8"],2,"Red, orange, yellow, green, blue, indigo and violet.","Science",2),
("Who painted the Mona Lisa?",["Leonardo da Vinci","Michelangelo","Raphael","Pablo Picasso"],0,"Leonardo da Vinci painted it in the early 1500s.","Art",3),
("Which is the smallest country in the world?",["Monaco","Vatican City","Malta","San Marino"],1,"Vatican City covers about 0.44 square kilometres.","Geography",3),
("What is the hardest natural substance?",["Gold","Iron","Diamond","Quartz"],2,"Diamond is the hardest natural material.","Science",3),
("Which gas do plants absorb from the air?",["Oxygen","Nitrogen","Carbon dioxide","Hydrogen"],2,"Plants use carbon dioxide for photosynthesis.","Science",3),
("Which planet has the most famous rings?",["Jupiter","Saturn","Uranus","Neptune"],1,"Saturn's rings are made of ice and rock.","Space",3),
("What is the currency of Japan?",["Won","Yuan","Yen","Ringgit"],2,"The Japanese yen.","Economy",4),
("Which planet is known as the Red Planet?",["Venus","Mars","Mercury","Neptune"],1,"Iron oxide on its surface gives Mars its red colour.","Space",4),
("How many bones does an adult human body have?",["186","206","226","256"],1,"An adult has 206 bones.","Body",4),
("Which is the largest hot desert in the world?",["Gobi","Sahara","Kalahari","Arabian"],1,"The Sahara covers much of North Africa.","Geography",4),
("Which is the largest country in the world by area?",["Canada","Russia","China","United States"],1,"Russia covers more than 17 million square kilometres.","Geography",4),
("Who wrote \"Romeo and Juliet\"?",["Charles Dickens","William Shakespeare","Jane Austen","Homer"],1,"Shakespeare wrote it in the 1590s.","Literature",5),
("What is the approximate speed of light?",["3,000 km/s","30,000 km/s","300,000 km/s","3,000,000 km/s"],2,"About 299,792 km per second.","Science",5),
("Which gas makes up most of Earth's atmosphere?",["Oxygen","Nitrogen","Argon","Carbon dioxide"],1,"Nitrogen is about 78% of the air.","Science",5),
("What is the smallest prime number?",["0","1","2","3"],2,"Two is the smallest and the only even prime number.","Maths",5),
("What is the capital of Australia?",["Sydney","Melbourne","Canberra","Perth"],2,"Canberra, not Sydney, is the capital.","Geography",6),
("Which element has the atomic number 1?",["Helium","Hydrogen","Lithium","Oxygen"],1,"Hydrogen is the lightest element.","Science",6),
("Who discovered penicillin?",["Louis Pasteur","Alexander Fleming","Marie Curie","Robert Koch"],1,"Fleming discovered it in 1928.","Science",6),
("What is the chemical symbol for gold?",["Ag","Au","Gd","Go"],1,"Au comes from the Latin word aurum.","Science",6),
("Which is the longest bone in the human body?",["Humerus","Femur","Tibia","Spine"],1,"The femur is the thigh bone.","Body",7),
("What is the capital of Canada?",["Toronto","Ottawa","Vancouver","Montreal"],1,"Ottawa is the capital of Canada.","Geography",7),
("In which year did the Titanic sink?",["1905","1912","1918","1923"],1,"It sank in April 1912 on its first voyage.","History",8),
("Who developed the theory of general relativity?",["Isaac Newton","Albert Einstein","Niels Bohr","Stephen Hawking"],1,"Einstein published it in 1915.","Science",8),
("What is the deepest known ocean trench?",["Puerto Rico Trench","Java Trench","Mariana Trench","Tonga Trench"],2,"The Mariana Trench is about 11 km deep.","Geography",9),
("Which scientist formulated the three laws of planetary motion?",["Galileo Galilei","Johannes Kepler","Nicolaus Copernicus","Tycho Brahe"],1,"Kepler published them in the early 1600s.","Space",10),
("Besides bromine, which element is liquid at room temperature?",["Mercury","Lead","Tin","Zinc"],0,"Mercury is a liquid metal at room temperature.","Science",10),
])
HAND['history']=('History Challenge','🏛️',[
("Who built the Great Pyramid of Giza as his tomb?",["Khufu","Ramses II","Tutankhamun","Akhenaten"],0,"It was built for the pharaoh Khufu around 2560 BC.","Ancient Egypt",1),
("What was the ancient Egyptian picture writing called?",["Cuneiform","Hieroglyphs","Latin","Runes"],1,"Hieroglyphs combined pictures and sounds.","Ancient Egypt",1),
("Who was the first man to walk on the Moon?",["Neil Armstrong","Buzz Aldrin","Yuri Gagarin","John Glenn"],0,"Neil Armstrong stepped on the Moon in July 1969.","Modern history",2),
("Which people built Machu Picchu?",["Aztecs","Maya","Inca","Olmec"],2,"The Inca built it in the 15th century.","World history",2),
("Who was the first President of Egypt?",["Gamal Abdel Nasser","Muhammad Naguib","Anwar Sadat","Hosni Mubarak"],1,"Muhammad Naguib became the first president in 1953.","Modern Egypt",3),
("In which year did the Egyptian Revolution take place?",["1948","1952","1956","1967"],1,"The Free Officers' revolution was in July 1952.","Modern Egypt",3),
("In which year did World War II end?",["1918","1939","1945","1950"],2,"The war ended in 1945.","Modern history",3),
("Which empire did Julius Caesar help to build?",["Greek","Persian","Roman","Ottoman"],2,"He led Rome before the empire formally began.","World history",3),
("Which Egyptian president led the country during the October 1973 War?",["Gamal Abdel Nasser","Anwar Sadat","Hosni Mubarak","Muhammad Naguib"],1,"Anwar Sadat was president during the war.","Modern Egypt",4),
("In which year did the Suez Canal open?",["1859","1869","1879","1889"],1,"The canal opened in November 1869.","Modern Egypt",4),
("Which queen of Egypt allied with Julius Caesar and later Mark Antony?",["Nefertiti","Hatshepsut","Cleopatra","Nefertari"],2,"Cleopatra VII was the last active ruler of Ptolemaic Egypt.","Ancient Egypt",4),
("The French Revolution began in which year?",["1689","1789","1812","1848"],1,"It began in 1789 with the storming of the Bastille.","World history",5),
("Which battle ended Napoleon's rule in 1815?",["Austerlitz","Trafalgar","Waterloo","Borodino"],2,"Napoleon was defeated at Waterloo.","World history",5),
("Who was the first emperor of a unified China?",["Kublai Khan","Qin Shi Huang","Sun Yat-sen","Emperor Wu of Han"],1,"Qin Shi Huang unified China in 221 BC.","World history",5),
("Which of the Seven Wonders of the Ancient World still stands?",["Hanging Gardens of Babylon","Colossus of Rhodes","Great Pyramid of Giza","Lighthouse of Alexandria"],2,"Only the Great Pyramid survives.","Ancient Egypt",5),
("Who discovered the tomb of Tutankhamun in 1922?",["Howard Carter","Jean-François Champollion","Flinders Petrie","Giovanni Belzoni"],0,"Howard Carter found it in the Valley of the Kings.","Ancient Egypt",6),
("Who deciphered Egyptian hieroglyphs using the Rosetta Stone?",["Jean-François Champollion","Howard Carter","Napoleon Bonaparte","Auguste Mariette"],0,"Champollion announced the breakthrough in 1822.","Ancient Egypt",6),
("In which year did the Berlin Wall fall?",["1961","1975","1989","1991"],2,"It fell on 9 November 1989.","Modern history",6),
("What was the capital of the Byzantine Empire?",["Constantinople","Rome","Athens","Alexandria"],0,"Constantinople, today's Istanbul.","World history",6),
("Which pharaoh fought the Hittites at the Battle of Kadesh?",["Thutmose III","Ramses II","Akhenaten","Khufu"],1,"Ramses II fought at Kadesh around 1274 BC.","Ancient Egypt",6),
("Who defeated the Crusaders at the Battle of Hattin in 1187?",["Baibars","Saladin","Qutuz","Tariq ibn Ziyad"],1,"Saladin's victory led to the recapture of Jerusalem.","Medieval history",7),
("Which battle in 1260 saw the Mamluks defeat the Mongols?",["Hattin","Ain Jalut","Manzikert","Yarmouk"],1,"The Mamluks won at Ain Jalut in Palestine.","Medieval history",7),
("Who founded modern Egypt as ruler from 1805?",["Ismail Pasha","Muhammad Ali Pasha","Said Pasha","Saladin"],1,"Muhammad Ali Pasha founded the dynasty that ruled until 1952.","Modern Egypt",7),
("Which pharaoh is known as the \"heretic king\" for promoting the worship of Aten?",["Ramses II","Akhenaten","Khufu","Seti I"],1,"Akhenaten promoted the worship of a single god, Aten.","Ancient Egypt",7),
("Which treaty ended World War I with Germany in 1919?",["Westphalia","Versailles","Vienna","Tordesillas"],1,"The Treaty of Versailles was signed in June 1919.","Modern history",8),
("Who was Alexander the Great's teacher?",["Plato","Socrates","Aristotle","Pythagoras"],2,"Aristotle taught him as a boy.","Ancient history",8),
("Who founded the Ottoman dynasty?",["Osman I","Mehmed II","Suleiman the Magnificent","Selim I"],0,"The dynasty is named after Osman I.","Medieval history",8),
("In which year did Constantinople fall to the Ottomans?",["1204","1389","1453","1517"],2,"Mehmed II conquered it in 1453.","Medieval history",9),
("In which year was the Magna Carta sealed?",["1066","1215","1348","1492"],1,"King John sealed it in 1215.","Medieval history",10),
("The Peace of Westphalia (1648) ended which war?",["Hundred Years' War","Thirty Years' War","Seven Years' War","Wars of the Roses"],1,"It ended the Thirty Years' War in Europe.","World history",10),
])
HAND['cinema']=('Movies & Series Challenge','🎬',[
("Which animated film features a clownfish called Nemo?",["Shark Tale","Finding Nemo","Moana","Cars"],1,"Finding Nemo was released by Pixar in 2003.","Animation",1),
("Which animated film features the lion cub Simba?",["Madagascar","The Lion King","Bambi","Tarzan"],1,"The Lion King (1994).","Animation",1),
("Who plays Captain Jack Sparrow in Pirates of the Caribbean?",["Orlando Bloom","Johnny Depp","Brad Pitt","Tom Cruise"],1,"Johnny Depp played Jack Sparrow.","Actors",2),
("Which film franchise features the Millennium Falcon?",["Star Trek","Star Wars","Dune","Alien"],1,"The Millennium Falcon is Han Solo's ship in Star Wars.","Franchises",2),
("In Harry Potter, which Hogwarts house does Harry belong to?",["Slytherin","Gryffindor","Ravenclaw","Hufflepuff"],1,"Harry is sorted into Gryffindor.","Franchises",2),
("Who directed Titanic (1997)?",["Steven Spielberg","James Cameron","Christopher Nolan","Ridley Scott"],1,"James Cameron directed it.","Directors",3),
("Who played Vito Corleone in The Godfather?",["Al Pacino","Marlon Brando","Robert De Niro","Robert Duvall"],1,"Marlon Brando won an Oscar for the role.","Actors",3),
("From which country is the film Parasite?",["Japan","China","South Korea","Thailand"],2,"Parasite is a South Korean film by Bong Joon-ho.","World cinema",3),
("Which actor starred in the Egyptian film \"Ismailia Rayeh Gayy\" (1997)?",["Ahmed Helmy","Mohamed Henedy","Adel Imam","Ahmed Mekky"],1,"Mohamed Henedy starred in this hit comedy.","Egyptian cinema",4),
("Which Egyptian actor is nicknamed \"Al Zaeem\" (the leader)?",["Ahmed Zaki","Adel Imam","Nour El-Sherif","Yehia El-Fakharany"],1,"Adel Imam is known as Al Zaeem.","Egyptian cinema",4),
("The series Game of Thrones is based on books by whom?",["J. R. R. Tolkien","George R. R. Martin","J. K. Rowling","C. S. Lewis"],1,"A Song of Ice and Fire by George R. R. Martin.","Series",4),
("Which actor plays Iron Man in the Marvel films?",["Chris Evans","Robert Downey Jr.","Chris Hemsworth","Mark Ruffalo"],1,"Robert Downey Jr. played Tony Stark.","Actors",4),
("Which film is about a team that enters people's dreams to plant an idea?",["Memento","Inception","The Matrix","Tenet"],1,"Inception (2010) by Christopher Nolan.","Films",4),
("Which actress is called \"the Lady of the Arabic Screen\"?",["Soad Hosny","Faten Hamama","Shadia","Mervat Amin"],1,"Faten Hamama earned this title.","Egyptian cinema",5),
("Who directed Inception and Interstellar?",["Denis Villeneuve","Christopher Nolan","Martin Scorsese","David Fincher"],1,"Christopher Nolan directed both.","Directors",5),
("Which series follows a chemistry teacher who starts making drugs?",["Ozark","Breaking Bad","Narcos","Dexter"],1,"Breaking Bad starring Bryan Cranston.","Series",5),
("Who directed Pulp Fiction?",["Martin Scorsese","Quentin Tarantino","Guy Ritchie","Brian De Palma"],1,"Quentin Tarantino, 1994.","Directors",5),
("Who directed Schindler's List?",["Steven Spielberg","Francis Ford Coppola","Oliver Stone","Ron Howard"],0,"Steven Spielberg, 1993.","Directors",5),
("Who played the Joker in The Dark Knight (2008)?",["Joaquin Phoenix","Heath Ledger","Jared Leto","Jack Nicholson"],1,"Heath Ledger won a posthumous Oscar for it.","Actors",6),
("Who directed the Egyptian films \"Cairo Station\" and \"Alexandria... Why?\"?",["Youssef Chahine","Salah Abu Seif","Henry Barakat","Shadi Abdel Salam"],0,"Youssef Chahine is one of Egypt's greatest directors.","Egyptian cinema",6),
("Who composed the music of Star Wars?",["Hans Zimmer","John Williams","Ennio Morricone","Howard Shore"],1,"John Williams composed the famous theme.","Music",6),
("In which Egyptian film did Ahmed Zaki play Gamal Abdel Nasser?",["Nasser 56","The Land","Al Karnak","Wahed min El Nas"],0,"Ahmed Zaki starred in Nasser 56 (1996).","Egyptian cinema",7),
("Who directed 2001: A Space Odyssey?",["Steven Spielberg","Stanley Kubrick","George Lucas","Ridley Scott"],1,"Stanley Kubrick, 1968.","Directors",7),
("Which film won 11 Oscars along with Ben-Hur and Titanic?",["Avatar","Gladiator","The Lord of the Rings: The Return of the King","Gone with the Wind"],2,"The Return of the King won all 11 awards it was nominated for.","Awards",8),
("Who directed Citizen Kane?",["Alfred Hitchcock","Orson Welles","Stanley Kubrick","John Ford"],1,"Orson Welles directed and starred in it.","Directors",8),
("Which film contains the line \"Here's looking at you, kid\"?",["Casablanca","Gone with the Wind","Citizen Kane","Vertigo"],0,"Humphrey Bogart says it in Casablanca (1942).","Classics",8),
("Who directed the Egyptian film \"The Mummy\" (Al-Mummia, 1969)?",["Youssef Chahine","Shadi Abdel Salam","Salah Abu Seif","Henry Barakat"],1,"Shadi Abdel Salam directed this masterpiece.","Egyptian cinema",8),
("Which film won the Palme d'Or at Cannes in 2019?",["Parasite","Joker","Roma","1917"],0,"Parasite won the Palme d'Or and later Best Picture.","Awards",9),
("Which film won the very first Academy Award for Best Picture?",["Wings","Sunrise","Metropolis","The Jazz Singer"],0,"Wings, at the first ceremony in 1929.","Awards",9),
("In which year was Kurosawa's \"Seven Samurai\" released?",["1954","1962","1971","1948"],0,"Seven Samurai came out in 1954.","World cinema",10),
])
HAND['fawazeer']=('Riddles & Puzzles Challenge','🧩',[
("What has hands but cannot clap?",["A clock","A tree","A statue","A glove"],0,"A clock has hands that point to the time.","Riddles",1),
("What gets wetter the more it dries?",["A towel","A sponge","Rain","A river"],0,"A towel dries things by getting wet.","Riddles",1),
("What has keys but cannot open locks?",["A map","A piano","A bank","A door"],1,"A piano has keys you press to play notes.","Riddles",2),
("What has a neck but no head?",["A bottle","A shirt","A tree","A river"],0,"A bottle has a neck.","Riddles",2),
("What goes up but never comes down?",["A balloon","Your age","A bird","Smoke"],1,"Your age only goes up.","Riddles",2),
("What can you catch but not throw?",["A ball","A cold","A fish","A star"],1,"You catch a cold.","Riddles",3),
("What has many teeth but cannot bite?",["A comb","A shark","A cat","A dog"],0,"A comb has teeth but cannot bite.","Riddles",3),
("I am tall when I am young and short when I am old. What am I?",["A tree","A candle","A man","A mountain"],1,"A candle melts as it burns.","Riddles",3),
("What runs but never walks?",["A river","A clock","A dog","A car"],0,"Water runs, but a river never walks.","Riddles",3),
("What has one eye but cannot see?",["A needle","A storm","A potato","A cyclops"],0,"A needle has an eye for thread.","Riddles",4),
("The more of me you take, the more you leave behind. What am I?",["Footsteps","Money","Time","Photos"],0,"The more steps you take, the more footsteps you leave.","Riddles",4),
("What can travel around the world while staying in a corner?",["A stamp","A ship","A bird","A shadow"],0,"A stamp stays in the corner of the envelope.","Riddles",4),
("What has a heart that does not beat?",["An artichoke","A robot","A statue","A card"],0,"An artichoke has a heart you can eat.","Riddles",4),
("What is full of holes but still holds water?",["A net","A sponge","A bucket","A cloud"],1,"A sponge soaks up water.","Riddles",5),
("What begins with T, ends with T, and has T inside it?",["A teapot","A tent","A tarot","A toast"],0,"Tea-pot: T, tea, T.","Riddles",5),
("What comes once in a minute, twice in a moment, but never in a thousand years?",["The letter M","The letter T","A second","A sneeze"],0,"Count the letter M in each word.","Riddles",5),
("What can fill a room but takes up no space?",["Light","A balloon","Furniture","Water"],0,"Light fills a room without taking space.","Riddles",5),
("Forward I am heavy, backward I am not. What am I?",["Ton","Rock","Stone","Iron"],0,"\"Ton\" reversed is \"not\".","Riddles",6),
("What has four fingers and a thumb but is not alive?",["A glove","A robot hand","A chair","A rake"],0,"A glove has four fingers and a thumb.","Riddles",6),
("What belongs to you, but other people use it more than you do?",["Your name","Your phone","Your car","Your house"],0,"People say your name more than you do.","Riddles",6),
("What has words but never speaks?",["A book","A radio","A phone","A parrot"],0,"A book is full of words.","Riddles",6),
("What breaks as soon as you say its name?",["Silence","A glass","A promise","A mirror"],0,"Saying \"silence\" breaks the silence.","Riddles",7),
("You see me once in June, twice in November, but never in May. What am I?",["The letter E","The letter N","The letter J","The number 6"],0,"Count the letter E in each month.","Riddles",7),
("What gets bigger the more you take away from it?",["A hole","A debt","A shadow","A pile"],0,"Digging more makes a hole bigger.","Riddles",7),
("What is always in front of you but cannot be seen?",["The future","The wind","The air","Your nose"],0,"The future is ahead of you.","Riddles",7),
("I speak without a mouth and hear without ears. What am I?",["An echo","A ghost","A radio","The wind"],0,"An echo repeats the sounds it hears.","Riddles",8),
("What can be broken without being touched?",["A promise","A glass","An egg","A bone"],0,"You can break a promise without touching anything.","Riddles",8),
("A man pushes his car to a hotel and tells the owner he is bankrupt. Why?",["He is playing Monopoly","His car broke down","He lost his wallet","He is a thief"],0,"He is playing the board game Monopoly.","Brain teasers",9),
("Two fathers and two sons go fishing. Each catches one fish, but only three fish are caught. How?",["There were three people: grandfather, father and son","One fish escaped","One person caught nothing","They shared a fish"],0,"A grandfather, his son and his grandson.","Brain teasers",10),
])

CATS = json.load(open(os.path.join(DATA, 'en', 'categories.json'), encoding='utf8')) if os.path.exists(os.path.join(DATA, 'en', 'categories.json')) else {}

def arabic(name):
    d = json.load(open(os.path.join(DATA, f'{name}Quiz.json'), encoding='utf8'))
    return d if isinstance(d, list) else d['questions']

def batch(name):
    p = os.path.join(DATA, 'en', 'batches', f'{name}.tsv')
    rows = {}
    if os.path.exists(p):
        for n, line in enumerate(open(p, encoding='utf8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'):
                continue
            f = line.split('\t')
            assert len(f) == 7, f'{name}.tsv line {n}: {len(f)} fields'
            rows[int(f[0])] = f[1:]
    return rows

def build():
    for name, (title, emoji, qs) in HAND.items():
        ar = {q['id']: q for q in arabic(name)}
        out = []
        for i, (q, o, c, e, cat, d) in enumerate(qs, 1):
            assert len(o) == 4 and 0 <= c < 4, (name, i)
            out.append({"id": 9000 + i, "question": q, "options": o, "correctAnswerIndex": c, "explanation": e, "category": cat, "difficulty": d, "emoji": emoji, "design": DES[(i - 1) % 8]})
        seen = {x['question'] for x in out}
        for aid, (q, o0, o1, o2, o3, ex) in sorted(batch(name).items()):
            if q in seen:
                print(f'  skipped duplicate question (arabic id {aid}): {q}')
                continue
            seen.add(q)
            a = ar[aid]
            cat = CATS.get(a['category'])
            assert cat, f'{name}: no English name for category {a["category"]!r} (add it to src/data/en/categories.json)'
            out.append({"id": aid, "question": q, "options": [o0, o1, o2, o3], "correctAnswerIndex": a['correctAnswerIndex'], "explanation": ex, "category": cat, "difficulty": a['difficulty'], "emoji": a.get('emoji') or emoji, "design": a['design']})
        if name == 'fawazeer':
            import en_generated
            seen2 = {x['question'] for x in out}
            for k, (q, o, c, e, cat, d) in enumerate(en_generated.all_generated()):
                if q in seen2:
                    continue
                seen2.add(q)
                out.append({"id": 20000 + k, "question": q, "options": o, "correctAnswerIndex": c, "explanation": e, "category": cat, "difficulty": d, "emoji": emoji, "design": DES[k % 8]})
        json.dump({"quizTitle": title, "totalQuestions": len(out), "questions": out}, open(os.path.join(DATA, 'en', f'{name}Quiz.en.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=2)
        print(name, len(out), 'questions', f'({len(batch(name))} translated)')

def dump(name, per):
    done = set(batch(name))
    seen = {}
    for q in arabic(name):
        if q['id'] in done:
            continue
        k = q['difficulty']
        if seen.get(k, 0) >= per:
            continue
        if 'الصورة' in q['question'] or 'الموضح' in q['question']:
            continue
        seen[k] = seen.get(k, 0) + 1
        if 'الصورة' in q['question'] or 'الموضح' in q['question']:
            continue  # points at a picture, which the English questions do not have
        o = q['options']
        print(f"{q['id']}|{q['question']}|{o[0]}|{o[1]}|{o[2]}|{o[3]}|{q['correctAnswerIndex']}")

if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'dump':
        dump(sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 10)
    else:
        build()
