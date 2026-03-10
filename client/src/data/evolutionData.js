// Evolution requirements: a level-based chain with parent reference
// Child Pokémon can only be unlocked after training parent to required level
// Comprehensive evolution lines across Gen 1-7
export const EVOLUTIONS = {
  // GEN 1 - KANTO
  // Bulbasaur line
  2:  { parent: 1, level: 16 },   // Ivysaur
  3:  { parent: 2, level: 32 },   // Venusaur
  // Charmander line  
  5:  { parent: 4, level: 16 },   // Charmeleon
  6:  { parent: 5, level: 36 },   // Charizard
  // Squirtle line
  8:  { parent: 7, level: 16 },   // Wartortle
  9:  { parent: 8, level: 36 },   // Blastoise
  // Caterpie line
  11: { parent: 10, level: 7 },   // Metapod
  12: { parent: 11, level: 10 },  // Butterfree
  // Weedle line
  14: { parent: 13, level: 7 },   // Kakuna
  15: { parent: 14, level: 10 },  // Beedrill
  // Pidgey line
  17: { parent: 16, level: 18 },  // Pidgeotto
  18: { parent: 17, level: 36 },  // Pidgeot
  // Rattata line
  20: { parent: 19, level: 20 },  // Raticate
  // Spearow line
  22: { parent: 21, level: 20 },  // Fearow
  // Ekans line
  24: { parent: 23, level: 22 },  // Arbok
  // Pikachu to Raichu
  26: { parent: 25, level: 16 },  // Raichu
  // Sandshrew line
  28: { parent: 27, level: 22 },  // Sandslash
  // Nidoran male
  33: { parent: 32, level: 16 },  // Nidorino
  34: { parent: 33, level: 32 },  // Nidoking
  // Nidoran female
  30: { parent: 29, level: 16 },  // Nidorina
  31: { parent: 30, level: 32 },  // Nidoqueen
  // Clefairy line
  36: { parent: 35, level: 0 },   // Clefable (Moon Stone)
  // Vulpix line
  38: { parent: 37, level: 0 },   // Ninetales (Fire Stone)
  // Jigglypuff line
  40: { parent: 39, level: 0 },   // Wigglytuff (Moon Stone)
  // Zubat line
  42: { parent: 41, level: 16 },  // Golbat
  // Oddish line
  44: { parent: 43, level: 0 },   // Gloom
  45: { parent: 44, level: 0 },   // Vileplume
  // Paras line
  47: { parent: 46, level: 24 },  // Parasect
  // Venonat line
  49: { parent: 48, level: 31 },  // Venomoth
  // Diglett line
  51: { parent: 50, level: 26 },  // Dugtrio
  // Meowth line
  53: { parent: 52, level: 28 },  // Persian
  // Psyduck line
  55: { parent: 54, level: 33 },  // Golduck
  // Mankey line
  57: { parent: 56, level: 28 },  // Primeape
  // Growlithe line
  59: { parent: 58, level: 0 },   // Arcanine (Fire Stone)
  // Poliwag line
  61: { parent: 60, level: 25 },  // Poliwhirl
  62: { parent: 61, level: 0 },   // Poliwrath (Water Stone)
  // Abra line
  64: { parent: 63, level: 16 },  // Kadabra
  65: { parent: 64, level: 38 },  // Alakazam
  // Machop line
  67: { parent: 66, level: 28 },  // Machoke
  68: { parent: 67, level: 36 },  // Machamp
  // Bellsprout line
  70: { parent: 69, level: 0 },   // Weepinbell
  71: { parent: 70, level: 0 },   // Victreebel
  // Tentacool line
  73: { parent: 72, level: 30 },  // Tentacruel
  // Slowpoke line
  80: { parent: 79, level: 37 },  // Slowbro
  // Geodude line
  75: { parent: 74, level: 25 },  // Graveler
  76: { parent: 75, level: 0 },   // Golem
  // Ponyta line
  78: { parent: 77, level: 40 },  // Rapidash
  // Magneton
  82: { parent: 81, level: 30 },  // Magneton
  // Doduo line
  85: { parent: 84, level: 26 },  // Dodrio
  // Seel line
  87: { parent: 86, level: 34 },  // Dewgong
  // Shellder line
  91: { parent: 90, level: 0 },   // Cloyster (Water Stone)
  // Gastly line
  93: { parent: 92, level: 25 },  // Haunter
  94: { parent: 93, level: 0 },   // Gengar
  // Horsea line
  117: { parent: 116, level: 32 }, // Seadra
  // Goldeen line
  119: { parent: 118, level: 33 }, // Seaking
  // Staryu line
  121: { parent: 120, level: 0 },  // Starmie (Water Stone)
  // Magikarp line
  130: { parent: 129, level: 20 }, // Gyarados
  // Eevee branches (stone evolution)
  134: { parent: 133, level: 0 }, // Vaporeon
  135: { parent: 133, level: 0 }, // Jolteon
  136: { parent: 133, level: 0 }, // Flareon
  // Omanyte line
  139: { parent: 138, level: 40 }, // Omastar
  // Kabuto line
  141: { parent: 140, level: 40 }, // Kabutops
  // Dratini line
  148: { parent: 147, level: 30 }, // Dragonair
  149: { parent: 148, level: 55 }, // Dragonite

  // GEN 2 - JOHTO
  // Chikorita line
  153: { parent: 152, level: 16 }, // Bayleef
  154: { parent: 153, level: 36 }, // Meganium
  // Cyndaquil line
  156: { parent: 155, level: 14 }, // Quilava
  157: { parent: 156, level: 36 }, // Typhlosion
  // Totodile line
  159: { parent: 158, level: 18 }, // Croconaw
  160: { parent: 159, level: 30 }, // Feraligatr
  // Sentret line
  162: { parent: 161, level: 15 }, // Furret
  // Hoothoot line
  164: { parent: 163, level: 34 }, // Noctowl
  // Spinarak line
  167: { parent: 166, level: 15 }, // Ledian
  // Crobat (Golbat evolution)
  169: { parent: 41, level: 0 },   // Crobat
  // Bellossom (Gloom evolution)
  182: { parent: 44, level: 0 },   // Bellossom (Sun Stone)
  // Politoed (Poliwhirl evolution)
  186: { parent: 61, level: 0 },   // Politoed
  // Espeon and Umbreon from Eevee
  196: { parent: 133, level: 0 },  // Espeon
  197: { parent: 133, level: 0 },  // Umbreon
  // Slowking
  199: { parent: 79, level: 0 },   // Slowking
  // Wooper line
  195: { parent: 194, level: 25 }, // Quagsire
  // Wobbuffet
  203: { parent: 202, level: 0 },  // Wobbuffet
  // Porygon2
  233: { parent: 137, level: 0 },  // Porygon2
  // Scizor (Scyther evolution)
  212: { parent: 123, level: 0 },  // Scizor
  // Steelix (Onix evolution)
  208: { parent: 95, level: 0 },   // Steelix
  // Kingdra (Seadra evolution)
  230: { parent: 117, level: 0 },  // Kingdra
  // Tyrogue evolutions
  106: { parent: 236, level: 0 },  // Hitmonlee
  107: { parent: 236, level: 0 },  // Hitmonchan
  237: { parent: 236, level: 0 },  // Hitmontop

  // GEN 3 - HOENN
  // Treecko line
  253: { parent: 252, level: 16 }, // Grovyle
  254: { parent: 253, level: 36 }, // Sceptile
  // Torchic line
  257: { parent: 256, level: 16 }, // Combusken
  258: { parent: 257, level: 36 }, // Blaziken  
  // Mudkip line
  260: { parent: 259, level: 16 }, // Marshtomp
  261: { parent: 260, level: 36 }, // Swampert
  // Taillow line
  278: { parent: 277, level: 22 }, // Swellow
  // Wingull/Pelipper line
  279: { parent: 278, level: 25 }, // Pelipper
  // Seedot line
  273: { parent: 272, level: 14 }, // Nuzleaf
  274: { parent: 273, level: 0 },  // Shiftry
  // Skitty line
  300: { parent: 299, level: 0 },  // Delcatty
  // Carvanha line
  320: { parent: 318, level: 30 }, // Sharpedo
  // Wailmer line
  322: { parent: 321, level: 40 }, // Wailord
  // Numel line
  323: { parent: 322, level: 33 }, // Camerupt
  // Barboach line
  343: { parent: 342, level: 30 }, // Whiscash
  // Corphish line
  342: { parent: 341, level: 30 }, // Crawdaunt
  // Baltoy line
  345: { parent: 344, level: 40 }, // Claydol
  // Lileep line
  347: { parent: 346, level: 30 }, // Cradily
  // Anorith line
  349: { parent: 348, level: 30 }, // Armaldo
  // Feebas line
  351: { parent: 350, level: 0 },  // Milotic (beauty evolve)

  // GEN 4 - SINNOH
  // GEN 4 - SINNOH
  // Turtwig line
  388: { parent: 387, level: 16 }, // Grotle
  389: { parent: 388, level: 36 }, // Torterra
  // Chimchar line
  391: { parent: 390, level: 16 }, // Monferno
  392: { parent: 391, level: 36 }, // Infernape
  // Piplup line
  394: { parent: 393, level: 16 }, // Prinplup
  395: { parent: 394, level: 36 }, // Empoleon
  // Starly line
  397: { parent: 396, level: 14 }, // Staravia
  398: { parent: 397, level: 34 }, // Staraptor
  // Bidoof line
  400: { parent: 399, level: 15 }, // Bibarel
  // Kricketot line
  402: { parent: 401, level: 10 }, // Kricketune
  // Shinx line
  404: { parent: 403, level: 15 }, // Luxio
  405: { parent: 404, level: 30 }, // Luxray
  // Budew line
  407: { parent: 406, level: 0 }, // Roserade
  // Cranidos line
  409: { parent: 408, level: 30 }, // Rampardos
  // Shieldon line
  411: { parent: 410, level: 30 }, // Bastiodon
  // Burmy line
  413: { parent: 412, level: 20 }, // Wormadam
  414: { parent: 412, level: 20 }, // Mothim
  // Combee line
  416: { parent: 415, level: 21 }, // Vespiquen
  // Buizel line
  418: { parent: 417, level: 26 }, // Floatzel
  // Cherubi line
  420: { parent: 419, level: 25 }, // Cherrim
  // Shellos line
  422: { parent: 421, level: 30 }, // Gastrodon
  // Drifloon line
  425: { parent: 424, level: 28 }, // Drifblim
  // Buneary line
  427: { parent: 426, level: 0 }, // Lopunny
  // Glameow line
  431: { parent: 430, level: 38 }, // Purugly
  // Chingling line
  433: { parent: 432, level: 0 }, // Chimecho
  // Stunky line
  435: { parent: 434, level: 34 }, // Skuntank
  // Bronzor line
  437: { parent: 436, level: 33 }, // Bronzong
  // Bonsly line
  439: { parent: 438, level: 0 }, // Sudowoodo
  // Mime Jr. line
  441: { parent: 440, level: 0 }, // Mr. Mime
  // Happiny line
  443: { parent: 442, level: 0 }, // Chansey
  // Riolu line
  449: { parent: 448, level: 0 }, // Lucario
  // Hippopotas line
  451: { parent: 450, level: 30 }, // Hippowdon
  // Skorupi line
  453: { parent: 452, level: 40 }, // Drapion
  // Croagunk line
  455: { parent: 454, level: 37 }, // Toxtricity
  // Finneon line
  458: { parent: 457, level: 31 }, // Lumineon
  // Snover line
  460: { parent: 459, level: 40 }, // Abomasnow
  // Special evolutions
  423: { parent: 190, level: 0 }, // Ambipom
  428: { parent: 200, level: 0 }, // Mismagius
  429: { parent: 198, level: 0 }, // Honchkrow
  461: { parent: 215, level: 0 }, // Weavile
  462: { parent: 81, level: 0 }, // Magnezone
  463: { parent: 108, level: 0 }, // Lickilicky
  464: { parent: 111, level: 0 }, // Rhyperior
  465: { parent: 114, level: 0 }, // Tangrowth
  466: { parent: 125, level: 0 }, // Electivire
  467: { parent: 126, level: 0 }, // Magmortar
  468: { parent: 176, level: 0 }, // Togekiss
  469: { parent: 193, level: 0 }, // Yanmega
  470: { parent: 133, level: 0 }, // Leafeon
  471: { parent: 133, level: 0 }, // Glaceon
  472: { parent: 207, level: 0 }, // Gliscor
  473: { parent: 221, level: 0 }, // Mamoswine
  474: { parent: 137, level: 0 }, // Porygon-Z
  475: { parent: 281, level: 0 }, // Gallade
  476: { parent: 299, level: 0 }, // Probopass
  477: { parent: 356, level: 0 }, // Dusknoir
  478: { parent: 361, level: 0 }, // Froslass

  // GEN 5 - UNOVA
  // Snivy line
  496: { parent: 495, level: 17 },
  497: { parent: 496, level: 36 },
  // Tepig line
  499: { parent: 498, level: 17 },
  500: { parent: 499, level: 36 },
  // Oshawott line
  502: { parent: 501, level: 17 },
  503: { parent: 502, level: 36 },
  // Patrat line
  505: { parent: 504, level: 20 },
  // Lillipup line
  507: { parent: 506, level: 16 },
  508: { parent: 507, level: 32 },
  // Purrloin line
  510: { parent: 509, level: 20 },
  // Pansage line
  512: { parent: 511, level: 0 }, // Leaf Stone
  // Pansear line
  514: { parent: 513, level: 0 }, // Fire Stone
  // Panpour line
  516: { parent: 515, level: 0 }, // Water Stone
  // Munna line
  518: { parent: 517, level: 0 }, // Moon Stone
  // Pidove line
  520: { parent: 519, level: 21 },
  521: { parent: 520, level: 32 },
  // Blitzle line
  523: { parent: 522, level: 27 },
  // Roggenrola line
  525: { parent: 524, level: 25 },
  526: { parent: 525, level: 0 }, // Trade
  // Woobat line
  528: { parent: 527, level: 0 }, // Friendship
  // Drilbur line
  530: { parent: 529, level: 31 },
  // Timburr line
  533: { parent: 532, level: 25 },
  534: { parent: 533, level: 0 }, // Trade
  // Tympole line
  536: { parent: 535, level: 25 },
  537: { parent: 536, level: 36 },
  // Sewaddle line
  541: { parent: 540, level: 20 },
  542: { parent: 541, level: 0 }, // Friendship
  // Venipede line
  544: { parent: 543, level: 22 },
  545: { parent: 544, level: 30 },
  // Cottonee line
  547: { parent: 546, level: 0 }, // Sun Stone
  // Petilil line
  549: { parent: 548, level: 0 }, // Sun Stone
  // Sandile line
  551: { parent: 550, level: 29 },
  552: { parent: 551, level: 40 },
  // Dwebble line
  555: { parent: 554, level: 34 },
  // Scraggy line
  557: { parent: 556, level: 39 },
  // Yamask line
  560: { parent: 559, level: 34 },
  // Tirtouga line
  565: { parent: 564, level: 37 },
  // Archen line
  567: { parent: 566, level: 37 },
  // Trubbish line
  569: { parent: 568, level: 36 },
  // Zorua line
  571: { parent: 570, level: 30 },
  // Minccino line
  573: { parent: 572, level: 0 }, // Friendship
  // Gothita line
  575: { parent: 574, level: 32 },
  576: { parent: 575, level: 41 },
  // Solosis line
  578: { parent: 577, level: 32 },
  579: { parent: 578, level: 41 },
  // Ducklett line
  581: { parent: 580, level: 35 },
  // Vanillite line
  583: { parent: 582, level: 35 },
  584: { parent: 583, level: 47 },
  // Deerling line
  586: { parent: 585, level: 34 },
  // Karrablast line
  589: { parent: 588, level: 0 }, // Trade with Shelmet
  // Foongus line
  591: { parent: 590, level: 39 },
  // Frillish line
  593: { parent: 592, level: 40 },
  // Joltik line
  596: { parent: 595, level: 36 },
  // Ferroseed line
  598: { parent: 597, level: 40 },
  // Klink line
  600: { parent: 599, level: 38 },
  601: { parent: 600, level: 49 },
  // Tynamo line
  603: { parent: 602, level: 39 },
  604: { parent: 603, level: 0 }, // Thunder Stone
  // Elgyem line
  606: { parent: 605, level: 42 },
  // Litwick line
  608: { parent: 607, level: 41 },
  609: { parent: 608, level: 0 }, // Dusk Stone
  // Axew line
  611: { parent: 610, level: 38 },
  612: { parent: 611, level: 48 },
  // Cubchoo line
  614: { parent: 613, level: 37 },
  // Shelmet line
  617: { parent: 616, level: 0 }, // Trade with Karrablast
  // Mienfoo line
  620: { parent: 619, level: 50 },
  // Golett line
  623: { parent: 622, level: 43 },
  // Pawniard line
  625: { parent: 624, level: 52 },
  // Rufflet line
  628: { parent: 627, level: 54 },
  // Vullaby line
  630: { parent: 629, level: 54 },
  // Deino line
  634: { parent: 633, level: 50 },
  635: { parent: 634, level: 64 },
  // Larvesta line
  637: { parent: 636, level: 59 },

  // GEN 6 - KALOS
  // Chespin line
  651: { parent: 650, level: 16 },
  652: { parent: 651, level: 36 },
  // Fennekin line
  654: { parent: 653, level: 16 },
  655: { parent: 654, level: 36 },
  // Froakie line
  657: { parent: 656, level: 16 },
  658: { parent: 657, level: 36 },
  // Bunnelby line
  660: { parent: 659, level: 20 },
  // Scatterbug line
  662: { parent: 661, level: 9 },
  663: { parent: 662, level: 12 },
  // Litleo line
  665: { parent: 664, level: 35 },
  // Flabébé line
  670: { parent: 669, level: 19 },
  671: { parent: 670, level: 0 }, // Shiny Stone
  // Skiddo line
  673: { parent: 672, level: 32 },
  // Pancham line
  675: { parent: 674, level: 32 }, // Dark-type in party
  // Espurr line
  678: { parent: 677, level: 25 },
  // Honedge line
  680: { parent: 679, level: 35 },
  681: { parent: 680, level: 0 }, // Dusk Stone
  // Spritzee line
  683: { parent: 682, level: 0 }, // Trade with Sachet
  // Swirlix line
  685: { parent: 684, level: 0 }, // Trade with Whipped Dream
  // Inkay line
  687: { parent: 686, level: 0 }, // Level 30 while holding console upside down
  // Binacle line
  689: { parent: 688, level: 39 },
  // Skrelp line
  691: { parent: 690, level: 48 },
  // Clauncher line
  693: { parent: 692, level: 37 },
  // Helioptile line
  695: { parent: 694, level: 0 }, // Sun Stone
  // Tyrunt line
  697: { parent: 696, level: 39 },
  // Amaura line
  699: { parent: 698, level: 39 },
  // Goomy line
  705: { parent: 704, level: 40 },
  706: { parent: 705, level: 50 },
  // Phantump line
  709: { parent: 708, level: 0 }, // Trade
  // Pumpkaboo line
  711: { parent: 710, level: 0 }, // Trade
  // Bergmite line
  713: { parent: 712, level: 37 },
  // Noibat line
  715: { parent: 714, level: 48 },

  // GEN 7 - ALOLA
  // Rowlet line
  723: { parent: 722, level: 17 },
  // Litten line
  726: { parent: 725, level: 17 },
  727: { parent: 726, level: 34 },
  // Popplio line
  729: { parent: 728, level: 17 },
  730: { parent: 729, level: 34 },
  // Pikipek line
  732: { parent: 731, level: 14 },
  733: { parent: 732, level: 28 },
  // Yungoos line
  735: { parent: 734, level: 20 },
  // Grubbin line
  737: { parent: 736, level: 20 },
  738: { parent: 737, level: 0 }, // Level up in Electric Terrain
  // Crabrawler line
  740: { parent: 739, level: 0 }, // Level up at Mount Lanakila
  // Cutiefly line
  743: { parent: 742, level: 25 },
  // Rockruff line
  745: { parent: 744, level: 25 }, // Different forms based on time
  // Mareanie line
  748: { parent: 747, level: 38 },
  // Mudbray line
  750: { parent: 749, level: 30 },
  // Dewpider line
  752: { parent: 751, level: 22 },
  // Fomantis line
  754: { parent: 753, level: 34 },
  // Morelull line
  756: { parent: 755, level: 24 },
  // Salandit line
  758: { parent: 757, level: 33 },
  // Stufful line
  760: { parent: 759, level: 27 },
  // Bounsweet line
  762: { parent: 761, level: 18 },
  763: { parent: 762, level: 0 }, // Level up female
};
