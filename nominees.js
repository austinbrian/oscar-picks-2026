const NOMINEES = {
    best_picture: {
        label: "Best Picture",
        nominees: [
            "Bugonia",
            "F1",
            "Frankenstein",
            "Hamnet",
            "Marty Supreme",
            "One Battle After Another",
            "The Secret Agent",
            "Sentimental Value",
            "Sinners",
            "Train Dreams"
        ]
    },
    best_director: {
        label: "Directing",
        nominees: [
            "Chloé Zhao — Hamnet",
            "Josh Safdie — Marty Supreme",
            "Paul Thomas Anderson — One Battle After Another",
            "Joachim Trier — Sentimental Value",
            "Ryan Coogler — Sinners"
        ]
    },
    best_actor: {
        label: "Actor in a Leading Role",
        nominees: [
            "Timothée Chalamet — Marty Supreme",
            "Leonardo DiCaprio — One Battle After Another",
            "Ethan Hawke — Blue Moon",
            "Michael B. Jordan — Sinners",
            "Wagner Moura — The Secret Agent"
        ]
    },
    best_actress: {
        label: "Actress in a Leading Role",
        nominees: [
            "Jessie Buckley — Hamnet",
            "Rose Byrne — If I Had Legs I'd Kick You",
            "Kate Hudson — Song Sung Blue",
            "Renate Reinsve — Sentimental Value",
            "Emma Stone — Bugonia"
        ]
    },
    best_supporting_actor: {
        label: "Actor in a Supporting Role",
        nominees: [
            "Benicio Del Toro — One Battle After Another",
            "Jacob Elordi — Frankenstein",
            "Delroy Lindo — Sinners",
            "Sean Penn — One Battle After Another",
            "Stellan Skarsgård — Sentimental Value"
        ]
    },
    best_supporting_actress: {
        label: "Actress in a Supporting Role",
        nominees: [
            "Elle Fanning — Sentimental Value",
            "Inga Ibsdotter Lilleaas — Sentimental Value",
            "Amy Madigan — Weapons",
            "Wunmi Mosaku — Sinners",
            "Teyana Taylor — One Battle After Another"
        ]
    },
    best_original_screenplay: {
        label: "Writing (Original Screenplay)",
        nominees: [
            "Blue Moon — Robert Kaplow",
            "It Was Just an Accident — Jafar Panahi",
            "Marty Supreme — Ronald Bronstein & Josh Safdie",
            "Sentimental Value — Eskil Vogt, Joachim Trier",
            "Sinners — Ryan Coogler"
        ]
    },
    best_adapted_screenplay: {
        label: "Writing (Adapted Screenplay)",
        nominees: [
            "Bugonia — Will Tracy",
            "Frankenstein — Guillermo del Toro",
            "Hamnet — Chloé Zhao & Maggie O'Farrell",
            "One Battle After Another — Paul Thomas Anderson",
            "Train Dreams — Clint Bentley & Greg Kwedar"
        ]
    },
    best_animated_feature: {
        label: "Animated Feature Film",
        nominees: [
            "Arco",
            "Elio",
            "Kpop Demon Hunters",
            "Little Amélie or the Character of Rain",
            "Zootopia 2"
        ]
    },
    best_international_feature: {
        label: "International Feature Film",
        nominees: [
            "The Secret Agent — Brazil",
            "It Was Just an Accident — France",
            "Sentimental Value — Norway",
            "Sirāt — Spain",
            "The Voice of Hind Rajab — Tunisia"
        ]
    },
    best_documentary_feature: {
        label: "Documentary Feature Film",
        nominees: [
            "The Alabama Solution",
            "Come See Me in the Good Light",
            "Cutting Through Rocks",
            "Mr. Nobody Against Putin",
            "The Perfect Neighbor"
        ]
    },
    best_documentary_short: {
        label: "Documentary Short Film",
        nominees: [
            "All the Empty Rooms",
            "Armed Only With a Camera: The Life and Death of Brent Renaud",
            "Children No More: \"Were and Are Gone\"",
            "The Devil Is Busy",
            "Perfectly a Strangeness"
        ]
    },
    best_live_action_short: {
        label: "Live Action Short Film",
        nominees: [
            "Butcher's Stain",
            "A Friend of Dorothy",
            "Jane Austen's Period Drama",
            "The Singers",
            "Two People Exchanging Saliva"
        ]
    },
    best_animated_short: {
        label: "Animated Short Film",
        nominees: [
            "Butterfly",
            "Forevergreen",
            "The Girl Who Cried Pearls",
            "Retirement Plan",
            "The Three Sisters"
        ]
    },
    best_original_score: {
        label: "Music (Original Score)",
        nominees: [
            "Bugonia — Jerskin Fendrix",
            "Frankenstein — Alexandre Desplat",
            "Hamnet — Max Richter",
            "One Battle After Another — Jonny Greenwood",
            "Sinners — Ludwig Göransson"
        ]
    },
    best_original_song: {
        label: "Music (Original Song)",
        nominees: [
            "\"Dear Me\" — Diane Warren: Relentless",
            "\"Golden\" — Kpop Demon Hunters",
            "\"I Lied To You\" — Sinners",
            "\"Sweet Dreams Of Joy\" — Viva Verdi!",
            "\"Train Dreams\" — Train Dreams"
        ]
    },
    best_cinematography: {
        label: "Cinematography",
        nominees: [
            "Frankenstein — Dan Laustsen",
            "Marty Supreme — Darius Khondji",
            "One Battle After Another — Michael Bauman",
            "Sinners — Autumn Durald Arkapaw",
            "Train Dreams — Adolpho Veloso"
        ]
    },
    best_film_editing: {
        label: "Film Editing",
        nominees: [
            "F1 — Stephen Mirrione",
            "Marty Supreme — Ronald Bronstein and Josh Safdie",
            "One Battle After Another — Andy Jurgensen",
            "Sentimental Value — Olivier Bugge Coutté",
            "Sinners — Michael P. Shawver"
        ]
    },
    best_production_design: {
        label: "Production Design",
        nominees: [
            "Frankenstein — Tamara Deverell; Shane Vieau",
            "Hamnet — Fiona Crombie; Alice Felton",
            "Marty Supreme — Jack Fisk; Adam Willis",
            "One Battle After Another — Florencia Martin; Anthony Carlino",
            "Sinners — Hannah Beachler; Monique Champagne"
        ]
    },
    best_costume_design: {
        label: "Costume Design",
        nominees: [
            "Avatar: Fire and Ash — Deborah L. Scott",
            "Frankenstein — Kate Hawley",
            "Hamnet — Malgosia Turzanska",
            "Marty Supreme — Miyako Bellizzi",
            "Sinners — Ruth E. Carter"
        ]
    },
    best_makeup_hairstyling: {
        label: "Makeup and Hairstyling",
        nominees: [
            "Frankenstein — Mike Hill, Jordan Samuel, Cliona Furey",
            "Kokuho — Kyoko Toyokawa, Naomi Hibino, Tadashi Nishimatsu",
            "Sinners — Ken Diaz, Mike Fontaine, Shunika Terry",
            "The Smashing Machine — Kazu Hiro, Glen Griffin, Bjoern Rehbein",
            "The Ugly Stepsister — Thomas Foldberg, Anne Cathrine Sauerberg"
        ]
    },
    best_sound: {
        label: "Sound",
        nominees: [
            "F1",
            "Frankenstein",
            "One Battle After Another",
            "Sinners",
            "Sirāt"
        ]
    },
    best_visual_effects: {
        label: "Visual Effects",
        nominees: [
            "Avatar: Fire and Ash",
            "F1",
            "Jurassic World Rebirth",
            "The Lost Bus",
            "Sinners"
        ]
    },
    best_casting: {
        label: "Casting",
        nominees: [
            "Hamnet — Nina Gold",
            "Marty Supreme — Jennifer Venditti",
            "One Battle After Another — Cassandra Kulukundis",
            "The Secret Agent — Gabriel Domingues",
            "Sinners — Francine Maisler"
        ]
    }
};
