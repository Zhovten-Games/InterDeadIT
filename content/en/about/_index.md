---
title: 'About'
description: 'A concise overview of InterDead and the team behind it.'
date: 2025-12-12
---

## Genesis of Gameplay

To provide a fuller understanding of the project’s concept, let us begin with a brief excursion through references — and, of course, with language.

### One of the key markers of social identity

A year ago I was first amused and then seriously intrigued by a study:  
[https://rke.abertay.ac.uk/en/publications/no-evidence-for-generational-differences-in-the-conventionalisati/](https://rke.abertay.ac.uk/en/publications/no-evidence-for-generational-differences-in-the-conventionalisati/)

**Brief conclusion:** after approximately a decade of mass use, “face” emoji function as a broad, cross-age, conventionalised sign system.

**Personal context.** Not everyone can or wants to operate in post-irony — especially at the level of pictograms — so I did not expect anything sensational here; and yet “the me of 2024” reacted to this work painfully acutely. At that moment, as for many others, the war between the Russian Federation (my homeland) and Ukraine (my wife’s homeland and the place of birth of our child) caught us off guard and left ragged seams that each person mends in their own way. As someone who is used to constructing things in my free time, I had an emergency hatch of imagination go off at a critical moment: I began to create a universal language — a sort of _lingua generalis_ not tied to any culture. Not because I saw language as the cause of war or as a panacea, but simply because, like a seamstress with a dubious sense of appropriateness, I was darning where it was tearing.

Let me clarify: I used the term _lingua generalis_ in a broad, working sense — as a label for an attempt to construct a universal language. When the first attempts were behind me, I reached the corresponding articles on Wikipedia and discovered how differently people formulate the task itself: on Wikipedia it looks like a set of “translations” of one and the same article, but in reality the links lead to noticeably different source texts — which unexpectedly highlighted both the breadth of the field and the fact that under the same heading many people understand the task differently. The English _philosophical language_ describes an entire class of artificial languages constructed “from scratch” on first principles; the Russian, Belarusian and Chinese versions of “universal language” are devoted almost entirely to Leibniz and his dream of a calculator-language; the German _Philosophie der idealen Sprache_ in fact speaks about the methodological programme of twentieth-century analytic philosophy, where the “ideal” language is already a logical apparatus for analysing natural speech, rather than a conlang. It turned out that my own endeavour, for all its amateur nature, in its intonation and ambition ended up closer to the Leibnizian line — an attempt to gather all meanings into a single “computational” language — than to modern conlangs or purely technical logical notations. Similar aspirations passed through Leibniz’s mind in the 1666 treatise _On the Art of Combinations_. The date, you will agree, is resonant: for a horror project it is almost a marketing slogan.

The brief log of attempts looked prosaic: at first I tried to lean on mathematics; then it emerged that even sign language and Morse code are not universal (which is not surprising at all: both are merely encoding systems for specific languages, not neutral substrates of meaning).

Thus the first provisional result of my — then still unconscious — collecting effort took shape: a truly “language for everyone” inevitably turns out to be the language of someone’s pain, memory and experience, and it is precisely with this, rather than with pure logic, that one has to deal further.

### Irrationality in wartime

In parallel with reflections on language, in 2024 I was struck by a topic that soon turned into a quite tangible “witch hunt”. With the onset of the war, demand in Russia for the services of various “psychics” promising to protect soldiers from death rose so high that legislators decided to approach them. In Ukraine, entrepreneurs were not idle either, although the scale was more modest — probably because such commerce has been restricted by law there since 2014.

Having noted the naïveté of the idea of repairing human misfortunes with a “universal language”, I came across an article about a surge of fashion for spiritualist séances during the Second World War, and at that very moment I was playing _Ad Infinitum_, where the player is briefly given a Ouija board.

This cyclical knot became the second provisional result of my collecting.

### Internal influence of the younger generation

Alongside the “heavy themes”, the future game is a direct descendant of an entertainment piece I made for myself and my son. The lineage is simple: we were inspired by _The Witcher: Monster Slayer_ from CD Projekt, which was shut down on 30 June 2023. We regularly “hunted” monsters, photographed them in ridiculously comical poses, and I assembled a simple analogue for internal use: we added Trevor Henderson’s monsters, some SCPs and all this pop-folklore menagerie from YouTube.

From the technical side, the application employed a heuristic approach: using Google Maps metadata, it attempted to classify locations by type and attach entities to the contexts of places. Put more simply, a set of rules was in effect: industrial area — increased probability of “Cartoon Dog”, parklands — other classes, and so on.

We entertain ourselves as best we can. A programmer father at the moment when the game servers shut down is a useful household artefact.

To the question “Why EcmaScript?” the answer is short and honest: Sprunki. This small cult showed that sometimes the language (including the programming one) is secondary.

At this point it becomes clearer why InterDead is structured exactly the way it is structured, and this becomes the end of the collecting.

## Conscious game design

There was no trigger shot into the air: I simply sat down and began. I sketched a prototype and the lore of the tool around which all the dramaturgy is built — an application created by a scientist who had spent years trying to establish contact with the dead. At some point he succeeded, although not in the form of an intimate conversation with a specific deceased person. If one reads the man’s biography carefully, familiar names surface — in our universe they are marked as real people; these are direct references to Clive Barker’s _Books of Blood_, _Pulse_ and other texts where the boundary between there and here behaves like a poorly sewn zipper.

The application has two wikis:

- https://interdead.fandom.com/wiki/InterDead_Wiki — the first one on Fandom;  
- the repository — the second, inside the application’s [code repository](https://github.com/Zhovten-Games/InterDeadIT), where its actual operation is described.

It turned out exactly as we were making it. I showed the draft to my wife, who works in game development, and received precise feedback: “Wrap it at least in a psychologically oriented game with a visual-novel interface, otherwise it’s a monument to self-analysis.” There was nothing to argue with — and, admittedly, I liked the idea.

“Form follows function,” Louis Sullivan reminded us. It is hard to come up with anything more natural: to build a game around an application that itself becomes a character (or at least corrects the protagonist’s actions) is not a piano lost in the bushes, but logic. The script flowed easily, the gameplay did not torment me with the humiliating question “what for?”. Instead, a different question arose.

### How to scare players?

I am a horror fan. Dozens of games, more than a thousand films, over three hundred books (yes, I keep count, because one day (possibly, if I live to old age) I intend to cover all of them with reviews). But does that make me a professional of the genre? Of course not. My sense of fear is somewhat atrophied, which means I risk becoming that very salesperson who has never used their own vacuum cleaner.

I followed the “marketing” path! A joke. If I had really followed it, this text would have ended halfway through. Not a funny joke, but it will become funnier further on.

I discussed the Big Five with GPT — the personality trait model used by HR specialists when selecting candidates. This happened accidentally; the neural network did not immediately understand what thickets I was climbing into, but I explained that this assessment system was insufficient for me and not particularly appropriate in our situation.

Please fix this moment in memory, because an interesting result lies ahead.

### PsiFramework

After a series of discussions with a neural network, I developed [PsiFramework](https://github.com/Zhovten-Games/PsyFramework) — a framework that makes it possible to examine fears through an academic lens of causes and triggers. A detailed description of the methodology can be found in a separate [post on LinkedIn](https://www.linkedin.com/posts/zhovten-games_psyframework-horrorgames-gamedev-activity-7390063601119551489-HlSj?utm_source=share&utm_medium=member_desktop&rcm=ACoAAFdDiTQBZ3sD2HwR_iilyxTEnTlROhLelmM).

The procedure is as follows:

1. identify the relevant diagnostic contours in which fear manifests as a clinically significant symptom;
2. collect recommendations on stimulus avoidance for vulnerable groups (having a practising psychiatrist in the family was helpful here);
3. operationalise the triggers so that they function in a game environment without simulating “turnkey psychometrics”.

The key decision was to deliberately step away from professional methods of assessing personality traits and not to “drive to exhaustion someone who avoids being touched”. Instead of attempting direct diagnostics, we identified **super-fears**: recurring motifs of anxiety that remain stable across different families of methodologies, i.e. not tied to specific boxes and labels. This made it possible to form a compact yet meaningful core of behavioural patterns suitable for designing levels, pacing and audiovisual accents without imposing clinical interpretations on the player.

The very point I suggested fixing a bit earlier is as follows: the five selected super-fears echo the “Big Five” of personality factors, and therefore we provisionally named the internal core **Echoed Big Five of Dread (EFBD)**. For someone familiar with how the Big Five works, this makes the construct particularly interesting: having started from the idea of a universal language of description, we arrived at a set of universal cultural fears.

### EFBD dossier

What exactly is fear cultivated from?

- **Social Echo**
- **Mind Static**
- **Decline**
- **Exposure**
- **Abandon**

We deliberately do not disclose the full interpretations of each scale before the game’s release; however, the scales themselves are not a secret. You will be able to observe the dynamics of your own values in your personal profile, which I will discuss later.

## Echo of an Unfading Memory

We have launched a website — the starting point inside our meta-universe, where mini-games make it possible to gradually form a player profile. These data will subsequently be used by the game’s core: on their basis dramaturgy, pacing and mode of presentation will be adapted. The task is non-trivial, but the technological contour has already been laid out.

### How this works

1. You log in with your Discord account.
2. You play the mini-games embedded in [our blog](http://localhost:1313/ru/blog/).
3. After the game’s release, you link the same account, and the system uses the already collected profile as a starting point for tailoring the experience.

### Disclaimers

#### Is it possible to reproduce the matching path and “peek” at how the scales work?

The project does not aim to turn the game into a piece of cybernetic weaponry, driving players to heart attacks for the sake of spectacular screenshots. Nevertheless, in principle the matching path is reproducible: given basic skills in working with data, our tool (described earlier) and the same GPT model, it can be reconstructed with acceptable effort.

Despite this, we consciously separate levels of transparency. The game’s source code and the detailed structure of the plot remain closed; at the same time, the general principles of how the system works, the framework’s structure and the scales used can be considered conditionally open. These are not so much “trade secrets” as an attempt to reduce the likelihood of accidental traumatisation of the most sensitive players.

#### Release date — Halloween 2026?

Originally, the release was indeed tied to this milestone. However, an event then occurred that significantly affected our budget and schedule; the details will be set out in a separate publication.

Here it is important to record the path travelled together with the company Grandma. My wife worked there for more than four years, and we are sincerely grateful both for the experience and for the people this period brought into our lives. Some of the games the team worked on will no longer see the light of day in their intended form, or will not be released at all, and these circumstances have directly affected the timing of our psychologically oriented horror project: there is a high probability that it will appear later than originally planned.

Our current situation is objectively less stable: we have had to abandon a number of “accelerators” that were planned to be financed from personal funds. Nonetheless, it would be premature to regard this as an official postponement of the release. It is more accurate to say that we are moving into a mode in which we rely primarily on our own resources rather than on the infrastructural “spinach” of third-party solutions.

At the same time, the project is not frozen. However our everyday schedules may unfold, InterDead receives small but real changes every day — and we do not intend to cancel it.

#### Is this game about the war between Russia and Ukraine?

No, the plot has not been and will not be tailored to specific real-world wars. It is more accurate to describe the situation as follows: the real war served as a trigger for conceptualising a fictional conflict within a fictional world. The actual hostilities influenced the set of themes, the tonality and local motifs, but in the game itself this influence is limited and manifests itself indirectly, rather than in the format of a direct reconstruction of events.

---

p.s.  
Our tools were designed to work carefully with memory, attention and fears — and it is precisely for this reason that we cannot guarantee that, after becoming acquainted with InterDead, your affective apparatus will remain in its initial state. Formally, we strive only for a varied player experience; informally — for this to be a game recalled as an event after which certain memories stubbornly refuse to fade.
