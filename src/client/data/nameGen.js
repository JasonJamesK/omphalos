const tables = {
  Human: {
    M: {
      first: ['Aldric','Borin','Cassian','Dorian','Edmund','Fabian','Gareth','Hadwin','Ivan','Jasper','Kendrick','Lysander','Marcus','Nathaniel','Osric','Percival','Roland','Silvanus','Tobias','Ulric','Vance','William','Xavier','Zacharias','Alaric','Benedict','Cedric','Damian','Eamon','Flynn','Gerard','Harlan','Ivor','Julian','Knox','Leoric','Malachar','Niles','Oswald','Pierce','Quincy','Radulf','Soren','Theron','Uther','Vincent','Walter','Xander','Yorick','Zane'],
      last: ['Ashford','Blackwood','Crane','Drake','Ellsworth','Fairfield','Goldwin','Harrow','Ironwood','Jarvis','Kessler','Langston','Mercer','Northgate','Pendleton','Ravenswood','Stonebridge','Thornton','Underwood','Whitmore','Aldgate','Bramble','Croft','Dunmore','Everhart','Foxglove','Galton','Halsworth','Ironfist','Jagger','Kettlewell','Lorne','Marwick','Nettlefield','Osterley','Prentiss','Quillman','Redford','Salcombe','Tanner','Urwick','Varley','Wyndham','Yorke','Zeal'],
    },
    F: {
      first: ['Alara','Brienne','Celestia','Dara','Elena','Fiona','Gwenith','Heloise','Isolde','Jadis','Kira','Lyanna','Marisol','Nadia','Ophelia','Petra','Rosamund','Seraphina','Talia','Ursula','Vivienne','Wren','Xandra','Ysabel','Zariah','Amara','Bethany','Clara','Diana','Evelyn','Fleur','Greta','Hilda','Isadora','Jenna','Katrin','Lorena','Mira','Niamh','Oona','Priya','Rhea','Stella','Tamsin','Ulena','Vera','Wilda','Xena','Yolanda','Zara'],
      last: ['Ashford','Blackwood','Crane','Drake','Ellsworth','Fairfield','Goldwin','Harrow','Ironwood','Jarvis','Kessler','Langston','Mercer','Northgate','Pendleton','Ravenswood','Stonebridge','Thornton','Underwood','Whitmore','Aldgate','Bramble','Croft','Dunmore','Everhart','Foxglove','Galton','Halsworth','Ironfist','Jagger','Kettlewell','Lorne','Marwick','Nettlefield','Osterley','Prentiss','Quillman','Redford','Salcombe','Tanner','Urwick','Varley','Wyndham','Yorke','Zeal'],
    },
    N: {
      first: ['Alder','Blair','Cassidy','Drew','Emery','Finley','Gray','Haven','Indigo','Jules','Kieran','Lark','Morgan','Noel','Oak','Pax','Quinn','Reeve','Sage','Thorn','Umber','Vale','Wren','Xen','Yew','Zephyr','Ash','Bay','Cedar','Dale','Elm','Fern','Glen','Holt','Iris','Jade','Kaolin','Linden','Mace','Nash','Onyx','Perry','Reed','Shale','Teal','Una','Vesper','Wilder','Xander','Yarrow','Zen'],
      last: ['Ashford','Blackwood','Crane','Drake','Ellsworth','Fairfield','Goldwin','Harrow','Ironwood','Jarvis','Kessler','Langston','Mercer','Northgate','Pendleton','Ravenswood','Stonebridge','Thornton','Underwood','Whitmore','Aldgate','Bramble','Croft','Dunmore','Everhart','Foxglove','Galton','Halsworth','Ironfist','Jagger','Kettlewell','Lorne','Marwick','Nettlefield','Osterley','Prentiss','Quillman','Redford','Salcombe','Tanner','Urwick','Varley','Wyndham','Yorke','Zeal'],
    },
  },
  Elf: {
    M: {
      first: ['Aerindel','Baelorin','Caladrel','Darathos','Eladrin','Falethar','Galathil','Halatir','Ilphelkiir','Jalathal','Kalanon','Larathar','Mirthallin','Naethos','Orindel','Parathos','Ralathar','Solthalion','Thalindel','Ulatheran','Valindel','Winthalar','Xalthos','Yalthariel','Zarathiel','Aerithos','Belithos','Celathos','Daelithos','Elrithos','Farathos','Gaelthos','Halithos','Ilorithos','Jalithos','Kelithos','Lalithos','Malithos','Nalithos','Olithos','Palithos','Qualithos','Ralithos','Salithos','Talithos','Ulithos','Valithos','Walithos','Xalithos','Yalithos'],
      last: ['Amakiir','Brightwood','Caelar','Elensar','Faebloom','Galanodel','Holimion','Ilphelkiir','Jorildyn','Keenheart','Liadon','Meliamne','Naïlo','Ostoroth','Prestor','Quelenna','Siannodel','Trisyra','Ulondarr','Xiloscient','Zinphistle','Aloro','Brightmantle','Cloudleaf','Duskwalker','Evenstar','Forestwind','Goldleaf','Highglen','Ironbark','Jadewing','Keenstar','Lightfoot','Moonsong','Nightleaf','Oakenshield','Pearlbranch','Quickleaf','Riverleaf','Silverleaf','Thornwood'],
    },
    F: {
      first: ['Aelindra','Briseis','Caladwen','Daelindra','Elaindra','Faelindra','Galadwen','Halindra','Ilsevele','Jalindra','Kaladwen','Lalindra','Mirathil','Naelindra','Orindel','Paralindra','Quenindra','Ralindra','Selaindra','Thalindra','Ualindra','Valindra','Winalindra','Xalindra','Yalindra','Zalindra','Aerindra','Belindra','Celindra','Delindra','Elindra','Falindra','Galindra','Halondra','Ilindra','Jalondra','Kalindra','Lindra','Malindra','Nalindra','Olindra','Palindra','Qualindra','Ralondra','Salindra','Talindra','Ulindra','Valondra','Walindra','Xalondra'],
      last: ['Amakiir','Brightwood','Caelar','Elensar','Faebloom','Galanodel','Holimion','Ilphelkiir','Jorildyn','Keenheart','Liadon','Meliamne','Naïlo','Ostoroth','Prestor','Quelenna','Siannodel','Trisyra','Ulondarr','Xiloscient','Zinphistle','Aloro','Brightmantle','Cloudleaf','Duskwalker','Evenstar','Forestwind','Goldleaf','Highglen','Ironbark','Jadewing','Keenstar','Lightfoot','Moonsong','Nightleaf','Oakenshield','Pearlbranch','Quickleaf','Riverleaf','Silverleaf','Thornwood'],
    },
    N: {
      first: ['Aelith','Brightleaf','Celith','Dewfall','Evermist','Faelight','Goldleaf','Highsong','Ivyleaf','Jadewing','Keelith','Leafsong','Mistsong','Nightleaf','Oakleaf','Petalfall','Quietleaf','Riverleaf','Silverleaf','Thornleaf','Underleal','Veilleaf','Windleaf','Xerith','Yellowleaf','Zephyrleaf','Aethon','Birchleaf','Cloudleaf','Dawnleaf','Elmleaf','Fernleaf','Greyleaf','Hazelleaf','Ivorystar','Jadelith','Keylith','Laylith','Maylith','Naylith','Oaylith','Paylith','Raylith','Saylith','Taylith','Ulith','Vaylith','Waylith','Xaylith','Yaylith'],
      last: ['Amakiir','Brightwood','Caelar','Elensar','Faebloom','Galanodel','Holimion','Ilphelkiir','Jorildyn','Keenheart','Liadon','Meliamne','Naïlo','Ostoroth','Prestor','Quelenna','Siannodel','Trisyra','Ulondarr','Xiloscient','Zinphistle','Aloro','Brightmantle','Cloudleaf','Duskwalker','Evenstar','Forestwind','Goldleaf','Highglen','Ironbark','Jadewing','Keenstar','Lightfoot','Moonsong','Nightleaf','Oakenshield','Pearlbranch','Quickleaf','Riverleaf','Silverleaf','Thornwood'],
    },
  },
  Dwarf: {
    M: {
      first: ['Balin','Borin','Dain','Durin','Fili','Gimli','Groin','Grym','Jorn','Kili','Lorn','Mori','Narl','Oin','Prin','Rorn','Sorn','Thorn','Ulforn','Vorn','Worn','Aldor','Brond','Crond','Drond','Eborn','Forn','Gorn','Horn','Irond','Jorn','Kond','Lord','Mord','Nord','Ond','Pond','Rond','Sond','Tond','Uond','Vond','Wond','Xond','Yond','Zond','Aborn','Bborn','Cborn','Dborn'],
      last: ['Battlehammer','Boldershoulder','Copperkettle','Fireforge','Frostbeard','Gorunn','Holderhek','Ironforge','Loderr','Lutgehr','Rumnaheim','Stoneseeker','Torunn','Ungart','Bolderk','Brawnanvil','Dackal','Forgefire','Hammerstone','Ironmantle','Kettleblack','Longbeard','Mithralvein','Oakenshield','Platedwarf','Quarrystone','Rockfist','Steelmantle','Stoneshaper','Underhill','Valheim','Warforge','Xendral','Yondral','Zendral'],
    },
    F: {
      first: ['Amber','Breena','Crystal','Dagny','Eldris','Fenna','Gunda','Helga','Inga','Jora','Kilda','Lenna','Marta','Nilda','Opal','Petra','Rina','Sigrid','Thyra','Ulna','Vilda','Wilda','Astrid','Brynja','Dagmar','Edda','Freyja','Gunhild','Halla','Ingrid','Jarnsaxa','Kara','Ljot','Magnhild','Nora','Olga','Ragnhild','Sigrun','Thyri','Unn','Valgerd','Wigdis','Xora','Yolda','Zora','Aasa','Bera','Ceri','Disa','Eira'],
      last: ['Battlehammer','Boldershoulder','Copperkettle','Fireforge','Frostbeard','Gorunn','Holderhek','Ironforge','Loderr','Lutgehr','Rumnaheim','Stoneseeker','Torunn','Ungart','Bolderk','Brawnanvil','Dackal','Forgefire','Hammerstone','Ironmantle','Kettleblack','Longbeard','Mithralvein','Oakenshield','Platedwarf','Quarrystone','Rockfist','Steelmantle','Stoneshaper','Underhill','Valheim','Warforge','Xendral','Yondral','Zendral'],
    },
    N: {
      first: ['Agate','Boulder','Crystal','Diamond','Ember','Flint','Garnet','Hammer','Iron','Jasper','Keg','Lodestone','Mithral','Nugget','Ore','Pebble','Quartz','Ruby','Stone','Topaz','Urist','Vein','Whetstone','Xenolith','Zinc','Anvil','Basalt','Coal','Dolomite','Feldspar','Gneiss','Hornblende','Ironstone','Jadeite','Kyanite','Limestone','Marble','Nephrite','Obsidian','Pyrite','Quartzite','Rhyolite','Schist','Talc','Ulexite','Vanadinite','Wolframite','Xonolite','Yttrialite','Zircon'],
      last: ['Battlehammer','Boldershoulder','Copperkettle','Fireforge','Frostbeard','Gorunn','Holderhek','Ironforge','Loderr','Lutgehr','Rumnaheim','Stoneseeker','Torunn','Ungart','Bolderk','Brawnanvil','Dackal','Forgefire','Hammerstone','Ironmantle','Kettleblack','Longbeard','Mithralvein','Oakenshield','Platedwarf','Quarrystone','Rockfist','Steelmantle','Stoneshaper','Underhill'],
    },
  },
  Halfling: {
    M: {
      first: ['Alton','Bilbo','Cade','Drago','Errich','Filbert','Garret','Hob','Ildon','Jago','Kito','Lyle','Merric','Nils','Osborn','Perrin','Quill','Rulo','Saul','Tomas','Ulmo','Vince','Wendel','Xander','Yago','Zande','Andry','Beau','Corrin','Davin','Eddic','Finn','Gorby','Halfred','Ingo','Jock','Kip','Leo','Merry','Ned','Otto','Pip','Rob','Sam','Teddy','Udo','Virgil','Wally','Xib','Yoric'],
      last: ['Brushgather','Goodbarrel','Greenbottle','Highhill','Hilltopple','Leagallow','Tealeaf','Thorngage','Tosscobble','Underbough','Warmwater','Willowmere','Bramblefoot','Cobblestone','Dustyroads','Evergreen','Fieldmouse','Goodfoot','Hearthstone','Ironpot','Jollygood','Kindlewood','Lightfoot','Meadowbrook','Nettlewick','Oldbottom','Pipeweed','Quickfoot','Riverstone','Softstep','Thistledown','Underbank','Velvethoof','Whisperwind','Yellowleaf'],
    },
    F: {
      first: ['Andry','Bree','Callie','Danika','Euphemia','Farrie','Gilda','Hanna','Isla','Jinny','Kithri','Lavinia','Myla','Nissa','Olivia','Posie','Queena','Renna','Seraphina','Tryn','Uma','Vani','Wren','Xara','Yolanda','Zara','Amaryllis','Blossom','Calla','Delly','Elanor','Fern','Goldie','Hesta','Ivy','Jilly','Kerry','Lila','May','Nell','Opal','Pearl','Rosa','Sunflower','Tilly','Ursula','Violet','Willow','Xena','Zinnia'],
      last: ['Brushgather','Goodbarrel','Greenbottle','Highhill','Hilltopple','Leagallow','Tealeaf','Thorngage','Tosscobble','Underbough','Warmwater','Willowmere','Bramblefoot','Cobblestone','Dustyroads','Evergreen','Fieldmouse','Goodfoot','Hearthstone','Ironpot','Jollygood','Kindlewood','Lightfoot','Meadowbrook','Nettlewick','Oldbottom','Pipeweed','Quickfoot','Riverstone','Softstep','Thistledown','Underbank','Velvethoof','Whisperwind','Yellowleaf'],
    },
    N: {
      first: ['Apple','Barley','Clover','Dusty','Elder','Fern','Grain','Hazel','Ivy','Juniper','Kindlewick','Lucky','Maple','Nettle','Oak','Pippin','Quiet','Rosehip','Sage','Thatch','Umber','Vale','Wheat','Yarrow','Acorn','Birch','Cobble','Daisy','Elm','Flax','Gorse','Heath','Indigo','Jay','Knoll','Larch','Mallow','Nut','Oat','Pine','Rye','Sorrel','Thorn','Umber','Vetch','Woad','Xander','Yew','Zinnia'],
      last: ['Brushgather','Goodbarrel','Greenbottle','Highhill','Hilltopple','Leagallow','Tealeaf','Thorngage','Tosscobble','Underbough','Warmwater','Willowmere','Bramblefoot','Cobblestone','Dustyroads','Evergreen','Fieldmouse','Goodfoot','Hearthstone','Ironpot','Jollygood','Kindlewood','Lightfoot','Meadowbrook','Nettlewick','Oldbottom','Pipeweed','Quickfoot','Riverstone','Softstep'],
    },
  },
  Gnome: {
    M: {
      first: ['Alston','Brocc','Burgell','Dimble','Eldon','Frug','Gerbo','Gimble','Glim','Jebeddo','Kellen','Namfoodle','Orryn','Roondar','Seebo','Sindri','Warryn','Wrenn','Zook','Boddynock','Connavar','Dabbledob','Erky','Fonkin','Gubbins','Hermup','Iggy','Jinkle','Krix','Libbik','Murnig','Nix','Ockrick','Pibble','Quibble','Ribble','Sibble','Tibble','Uibble','Vibble','Wibble','Xibble','Yibble','Zibble','Addle','Baddle','Caddle','Daddle','Faddle'],
      last: ['Albaratorix','Buren','Cloak','Daergel','Dunwhiffle','Fabblestabble','Fapplestamp','Finleebum','Folkor','Garrick','Glittergem','Goblinslayer','Hochsprung','Ipsifendee','Jebtek','Klemfiddle','Laptusuran','Licksworth','Nox','Parilmotton','Quebell','Scheppen','Turen','Underbite','Valturnix','Wibbleshins','Xorvix','Yellingford','Zibblequirk','Alborax','Bumblewick','Crinklenose','Doodlejump','Fiddlesticks','Gigglesnort'],
    },
    F: {
      first: ['Bimpnottin','Caramip','Duvamil','Ella','Ellyjobell','Ellywick','Lilli','Loopmottin','Lorilla','Mardnab','Nissa','Nyx','Oda','Orla','Roywyn','Shamil','Tana','Waywocket','Zanna','Alvyn','Boddynock','Carlin','Dingle','Efemmah','Fenella','Gella','Hetta','Illi','Jinx','Kori','Linni','Mimsy','Nori','Pippa','Quilby','Rixie','Siskin','Tippi','Upsy','Vinni','Winki','Xixi','Yippi','Zippy','Abble','Bibble','Cibble','Dibble','Fibble','Gibble'],
      last: ['Albaratorix','Buren','Cloak','Daergel','Dunwhiffle','Fabblestabble','Fapplestamp','Finleebum','Folkor','Garrick','Glittergem','Goblinslayer','Hochsprung','Ipsifendee','Jebtek','Klemfiddle','Laptusuran','Licksworth','Nox','Parilmotton','Quebell','Scheppen','Turen','Underbite','Valturnix','Wibbleshins','Xorvix','Yellingford','Zibblequirk','Alborax','Bumblewick','Crinklenose','Doodlejump','Fiddlesticks','Gigglesnort'],
    },
    N: {
      first: ['Blink','Clink','Dink','Fizz','Glimmer','Hink','Inkle','Jinkle','Klink','Link','Mink','Ninkle','Pink','Quink','Rink','Sink','Tink','Vink','Wink','Xink','Yink','Zink','Binker','Clinker','Dinkle','Finkle','Ginkle','Hinkle','Jinkle','Kinkle','Linkle','Minkle','Ninkle','Pinkle','Quinkle','Rinkle','Sinkle','Tinkle','Vinkle','Winkle','Xinkle','Yinkle','Zinkle','Alink','Blink','Flink','Glink','Mlink','Slink','Wlink'],
      last: ['Albaratorix','Buren','Cloak','Daergel','Dunwhiffle','Fabblestabble','Fapplestamp','Finleebum','Folkor','Garrick','Glittergem','Goblinslayer','Hochsprung','Ipsifendee','Jebtek','Klemfiddle','Laptusuran','Licksworth','Nox','Parilmotton','Quebell','Scheppen','Turen','Underbite','Valturnix','Wibbleshins','Xorvix','Yellingford','Zibblequirk'],
    },
  },
  'Half-Orc': {
    M: {
      first: ['Dench','Feng','Gell','Henk','Holg','Imsh','Keth','Krusk','Mhurren','Ront','Shump','Thokk','Vorka','Wertha','Yurk','Zug','Ardak','Braak','Crusk','Druuk','Erg','Ferk','Grommash','Harg','Irk','Jork','Karg','Lurk','Morg','Norg','Org','Porg','Rorg','Sorg','Torg','Uorg','Vorg','Worg','Xorg','Yorg','Zorg','Aurg','Burg','Curg','Durg','Furg','Gurg','Hurg','Jurg','Kurg'],
      last: ['Blacktusk','Bloodfang','Cruelcut','Darksword','Emberstrike','Firthak','Garthok','Harkthorn','Ironjaw','Jartak','Killborn','Longtusk','Morthak','Northak','Orcborn','Palefire','Rageblade','Skullcrush','Thornhide','Ukrath','Vorthak','Warsong','Xarthok','Yartak','Zarthok','Axeborn','Bonebreaker','Cragfist','Darkmantle','Earthshaker','Fleshrender','Grimtusk','Hacksaw','Ironback','Jawcrusher'],
    },
    F: {
      first: ['Baggi','Emen','Engong','Kansif','Myev','Neega','Ovak','Ownka','Shautha','Sutha','Vola','Volen','Yevelda','Zarka','Zulka','Artha','Basha','Carga','Darga','Elka','Frasha','Grisha','Harsha','Inka','Jurga','Kasha','Larka','Murga','Norka','Orka','Parka','Rarka','Sarka','Tarka','Urka','Varka','Warka','Xarka','Yarka','Zarka','Arga','Braga','Craga','Draga','Fraga','Graga','Hraga','Iraga','Jraga','Kraga'],
      last: ['Blacktusk','Bloodfang','Cruelcut','Darksword','Emberstrike','Firthak','Garthok','Harkthorn','Ironjaw','Jartak','Killborn','Longtusk','Morthak','Northak','Orcborn','Palefire','Rageblade','Skullcrush','Thornhide','Ukrath','Vorthak','Warsong','Xarthok','Yartak','Zarthok','Axeborn','Bonebreaker','Cragfist','Darkmantle','Earthshaker','Fleshrender','Grimtusk','Hacksaw','Ironback','Jawcrusher'],
    },
    N: {
      first: ['Ash','Blade','Claw','Dark','Edge','Fang','Grim','Hack','Iron','Jagged','Kill','Lurk','Maw','Null','Ore','Pain','Rage','Scar','Tear','Urge','Vile','Wrath','Xen','Yell','Zeal','Axe','Blood','Crush','Death','Ember','Fire','Gore','Hate','Ire','Jab','Krak','Lash','Maim','Null','Omen','Pyre','Rend','Smash','Torn','Ugly','Vex','Wail','Xero','Yoke','Zero'],
      last: ['Blacktusk','Bloodfang','Cruelcut','Darksword','Emberstrike','Firthak','Garthok','Harkthorn','Ironjaw','Jartak','Killborn','Longtusk','Morthak','Northak','Orcborn','Palefire','Rageblade','Skullcrush','Thornhide','Ukrath','Vorthak','Warsong','Xarthok','Yartak','Zarthok','Axeborn','Bonebreaker','Cragfist','Darkmantle'],
    },
  },
  Tiefling: {
    M: {
      first: ['Akmenos','Amnon','Barakas','Damakos','Ekemon','Iados','Kairon','Leucis','Melech','Mordai','Morthos','Pelaios','Skamos','Therai','Zovvut','Akshara','Balthazar','Cazimir','Daemon','Ezekiah','Ferox','Grimoire','Helios','Infernal','Jadis','Kaspian','Luzifer','Mordant','Nefas','Oberon','Phaeron','Qaimos','Rhovos','Skethis','Tavros','Umbrak','Vexas','Wolvek','Xanos','Yuvos','Zorvos','Akheron','Belfos','Cerros','Dhormos','Eratos','Fhivos','Ghavos','Hravos','Iravos'],
      last: ['Brimstone','Cinderfall','Dawnseeker','Emberheart','Firesong','Grimhallow','Hellborn','Ironveil','Jadewrath','Kindlecurse','Lucivar','Mournfall','Nightborn','Omensong','Pyrewarden','Quillfire','Runeborn','Shadowsong','Thornfire','Umbraveil','Vexborn','Wrathsong','Xuldark','Yearnfire','Zorvath','Ashborn','Blasphemy','Corruptborn','Damnedsoul','Emberseal','Flameborn','Grimlock','Hellseal','Infernalis','Jadecurse'],
    },
    F: {
      first: ['Akta','Anis','Bryseis','Criella','Damaia','Ea','Kallista','Lerissa','Makaria','Nemeia','Orianna','Phelaia','Rieta','Soul','Vaela','Xal','Ylivia','Zaela','Zivvut','Alyxan','Brimstone','Cinder','Desire','Ember','Fury','Gehenna','Hellena','Ire','Jadis','Karma','Lust','Malice','Nox','Omen','Pain','Ruin','Shade','Torment','Umbra','Vex','Woe','Xul','Yoke','Zeal','Akela','Braxa','Crixia','Dexia','Exia','Frixia'],
      last: ['Brimstone','Cinderfall','Dawnseeker','Emberheart','Firesong','Grimhallow','Hellborn','Ironveil','Jadewrath','Kindlecurse','Lucivar','Mournfall','Nightborn','Omensong','Pyrewarden','Quillfire','Runeborn','Shadowsong','Thornfire','Umbraveil','Vexborn','Wrathsong','Xuldark','Yearnfire','Zorvath','Ashborn','Blasphemy','Corruptborn','Damnedsoul','Emberseal','Flameborn','Grimlock','Hellseal','Infernalis','Jadecurse'],
    },
    N: {
      first: ['Abyss','Bane','Cinder','Dread','Ember','Flame','Gloom','Hex','Infernal','Jinx','Karma','Malice','Nox','Omen','Pain','Ruin','Shade','Torment','Umbra','Vex','Woe','Xul','Yoke','Ash','Blight','Curse','Dark','Evil','Fell','Grim','Hate','Ill','Jest','Knell','Lurk','Maim','Null','Omen','Plague','Rave','Spite','Taint','Ulcer','Venom','Wither','Xerom','Yearn','Zeal','Afflict','Begrime'],
      last: ['Brimstone','Cinderfall','Dawnseeker','Emberheart','Firesong','Grimhallow','Hellborn','Ironveil','Jadewrath','Kindlecurse','Lucivar','Mournfall','Nightborn','Omensong','Pyrewarden','Quillfire','Runeborn','Shadowsong','Thornfire','Umbraveil','Vexborn','Wrathsong','Xuldark','Yearnfire','Zorvath','Ashborn','Blasphemy','Corruptborn'],
    },
  },
  Dragonborn: {
    M: {
      first: ['Arjhan','Balasar','Bharash','Donaar','Ghesh','Heskan','Kriv','Medrash','Mehen','Nadarr','Pandjed','Patrin','Rhogar','Shamash','Shedinn','Torinn','Whelgar','Xolkin','Yarjerit','Zedaar','Aerokos','Crixus','Darastrix','Ethnor','Faustus','Garyx','Hethcypse','Irhtos','Jaxan','Kaustrix','Loreth','Marastrix','Naxith','Oxith','Paxith','Raxith','Skarith','Taxith','Uxith','Vaxith','Waxith','Xaxith','Yaxith','Zaxith','Brith','Crith','Drith','Frith','Grith','Hrith'],
      last: ['Clethtinthiallor','Daardendrian','Delmirev','Drachedandion','Fenkenkabradon','Kepeshkmolik','Kerrhylon','Kimbatuul','Linxakasendalor','Myastan','Nemmonis','Norixius','Ophinshtalajiir','Prexijandilin','Shestendeliath','Turnuroth','Yarjerit','Zorathkar','Flamescale','Goldenwing','Highcrest','Ironbound','Jadeclaw','Kindleborn','Longfang','Mistscale','Nightwing','Obsidianborn','Pearlscale','Quickstrike','Runescale','Silvertalon','Thornfang','Umbrawing','Voidshard'],
    },
    F: {
      first: ['Akra','Biri','Daar','Farideh','Harann','Havilar','Jheri','Kava','Korinn','Mishann','Nala','Perra','Raiann','Sora','Surina','Thava','Uadjit','Vezera','Wivonia','Yara','Zykira','Ariveth','Brightscale','Cinderwing','Dawnscale','Ebonwing','Firewrath','Goldscale','Hailstorm','Ironscale','Jadewing','Kindlescale','Lightscale','Moonscale','Nightscale','Obsidianwing','Pearlscale','Quickscale','Runescale','Silverscale','Thornwing','Umbrawing','Voidscale','Windscale','Xenclaw','Yeardawn','Zincclaw','Ashscale','Bronzewing','Copperscale'],
      last: ['Clethtinthiallor','Daardendrian','Delmirev','Drachedandion','Fenkenkabradon','Kepeshkmolik','Kerrhylon','Kimbatuul','Linxakasendalor','Myastan','Nemmonis','Norixius','Ophinshtalajiir','Prexijandilin','Shestendeliath','Turnuroth','Yarjerit','Zorathkar','Flamescale','Goldenwing','Highcrest','Ironbound','Jadeclaw','Kindleborn','Longfang','Mistscale','Nightwing','Obsidianborn','Pearlscale','Quickstrike','Runescale','Silvertalon','Thornfang','Umbrawing','Voidshard'],
    },
    N: {
      first: ['Arcanis','Brightscale','Crystalwing','Darkmaw','Emberclaw','Flamewing','Goldscale','Highcrest','Ironscale','Jadeclaw','Keenwing','Longfang','Mistscale','Nightwing','Obsidian','Pearlscale','Quickclaw','Razorwing','Silverscale','Thornfang','Umbrawing','Voidscale','Windcrest','Xenclaw','Yeardawn','Zincclaw','Ashscale','Bronzewing','Copperscale','Diamondwing','Emeraldclaw','Frostscale','Garnetscale','Hellfang','Iceclaw','Jadescale','Keyscale','Lavascale','Magmaclaw','Nettlescale','Opalkeel','Plasmaclaw','Quartzscale','Rubywing','Sapphireclaw','Tourmalinescale','Umberclaw','Vanadinite','Wolfscale','Xenoscale'],
      last: ['Clethtinthiallor','Daardendrian','Delmirev','Drachedandion','Fenkenkabradon','Kepeshkmolik','Kerrhylon','Kimbatuul','Linxakasendalor','Myastan','Nemmonis','Norixius','Ophinshtalajiir','Prexijandilin','Shestendeliath','Turnuroth','Yarjerit','Zorathkar','Flamescale','Goldenwing','Highcrest','Ironbound','Jadeclaw','Kindleborn','Longfang','Mistscale','Nightwing'],
    },
  },
  'Half-Elf': {
    M: {
      first: ['Adran','Aelar','Aramil','Arannis','Aust','Beiro','Berrian','Carric','Enialis','Erdan','Erevan','Galinndan','Hadarai','Heian','Himo','Immeral','Ivellios','Laucian','Mindartis','Paelias','Peren','Quarion','Riardon','Rolen','Soveliss','Thamior','Tharivol','Theren','Varis','Xanaphia','Yalindel','Zandrel','Aelindel','Brightstar','Celindor','Dawnwalker','Elindor','Faeborn','Galandel','Highstar','Ilindel','Jadewing','Kelindel','Leafwalker','Mindthel','Nightstar','Orindel','Pathwalker','Quelindel','Riverwalker'],
      last: ['Amakiir','Ashwood','Brightmantle','Celadon','Dawnseeker','Elinsira','Faeborn','Galanodel','Halfwood','Ironleaf','Jadewing','Keyleth','Leafwalker','Mindthel','Nightstar','Orindel','Pathfinder','Quelenna','Riverwalker','Silverstar','Thornwalker','Ulindel','Valindel','Windwalker','Xerindel','Zalindel','Ashleaf','Brightleaf','Celadon','Dawnleaf','Elindor','Forestborn','Groveborn','Hillborn','Ironwood','Jadeleaf'],
    },
    F: {
      first: ['Adrie','Althaea','Anastrianna','Andraste','Antinua','Bethrynna','Birel','Caelynn','Drusilia','Enna','Felosial','Ielenia','Jelenneth','Keyleth','Leshanna','Lia','Mialee','Naivara','Quelenna','Quillathe','Sariel','Shanairra','Shava','Silaqui','Sumia','Theirastra','Thiala','Vadania','Valanthe','Xanaphia','Yalindra','Zalindra','Aelindra','Brightstar','Celindra','Dawnwalker','Elindra','Faeborn','Galandra','Highstar','Ilindra','Jadewing','Kelindra','Leafwalker','Mindthal','Nightstar','Orindra','Pathwalker','Quelindra','Riverwalker'],
      last: ['Amakiir','Ashwood','Brightmantle','Celadon','Dawnseeker','Elinsira','Faeborn','Galanodel','Halfwood','Ironleaf','Jadewing','Keyleth','Leafwalker','Mindthel','Nightstar','Orindel','Pathfinder','Quelenna','Riverwalker','Silverstar','Thornwalker','Ulindel','Valindel','Windwalker','Xerindel','Zalindel','Ashleaf','Brightleaf','Celadon','Dawnleaf','Elindor','Forestborn','Groveborn','Hillborn','Ironwood','Jadeleaf'],
    },
    N: {
      first: ['Aelindel','Brightstar','Celindor','Dawnwalker','Elindor','Faeborn','Galandel','Highstar','Ilindel','Jadewing','Kelindel','Leafwalker','Mindthel','Nightstar','Orindel','Pathwalker','Quelindel','Riverwalker','Silverstar','Thornwalker','Ulindel','Valindel','Windwalker','Xerindel','Yalindel','Zalindel','Ashleaf','Brightleaf','Celithil','Dawnleaf','Elmleaf','Fernleaf','Greystar','Hazelstar','Ivorystar','Jadelith','Keylith','Laylith','Maylith','Naylith','Oaylith','Paylith','Raylith','Saylith','Taylith','Ulith','Vaylith','Waylith','Xaylith','Yaylith'],
      last: ['Amakiir','Ashwood','Brightmantle','Celadon','Dawnseeker','Elinsira','Faeborn','Galanodel','Halfwood','Ironleaf','Jadewing','Keyleth','Leafwalker','Mindthel','Nightstar','Orindel','Pathfinder','Quelenna','Riverwalker','Silverstar','Thornwalker','Ulindel','Valindel','Windwalker','Xerindel','Zalindel','Ashleaf','Brightleaf','Celadon','Dawnleaf'],
    },
  },
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateName(gender, race) {
  const raceData = tables[race]
  if (!raceData) return { first: 'Unknown', last: 'Unknown' }
  const genderData = raceData[gender] || raceData['M']
  return {
    first: pick(genderData.first),
    last: pick(genderData.last),
  }
}

export const RACES = Object.keys(tables)
export const GENDERS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'N', label: 'Non-binary' },
]
