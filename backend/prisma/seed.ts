import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type Difficulty = 'easy' | 'moderate' | 'challenging' | 'difficult'

type DestinationSeed = {
  categorySlug: string
  name: string
  slug: string
  province: string
  district: string
  shortDescription: string
  overview: string
  highlights: string
  localFood: string
  travelEssentials: string
  bestSeason: string
  recommendedDurationDays: number
  difficultyLevel: Difficulty
  costPerPersonPerDay: number
  latitude: number
  longitude: number
  imagePath: string
}

const categories = [
  {
    name: 'Adventure & High Passes',
    slug: 'adventure',
    description: 'Trekking, mountaineering, paragliding, rafting and high passes.',
  },
  {
    name: 'Sacred & Heritage',
    slug: 'sacred',
    description: 'Temples, monasteries, pilgrimage sites and heritage walks.',
  },
  {
    name: 'Lakes & Serenity',
    slug: 'lakes',
    description: 'Still water, viewpoints and quiet villages at altitude.',
  },
  {
    name: 'Wildlife & Terai',
    slug: 'wildlife',
    description: 'National parks, jungle safaris, birdwatching and Tharu culture.',
  },
]

const destinations: DestinationSeed[] = [
  {
    categorySlug: 'adventure',
    name: 'Everest Base Camp & Kala Patthar',
    slug: 'everest-base-camp',
    province: 'Koshi',
    district: 'Solukhumbu',
    shortDescription:
      'The classic Khumbu trek through Sherpa villages, rhododendron forest and glacier moraine to the foot of Everest, finishing with a sunrise on Kala Patthar.',
    overview: `The trail begins with a short flight into Lukla and climbs steadily through the Dudh Koshi valley — Phakding, Monjo, Namche Bazaar — before turning north towards Tengboche, Dingboche and Lobuche. Each village sits a little higher than the last, and the walk is built around acclimatisation rather than speed.

Above Gorak Shep the landscape turns to moraine and ice. Base Camp itself is a cluster of tents on the glacier in season; the better view is from Kala Patthar at 5,545 m, where the south face of Everest catches first light. Most trekkers rate that sunrise above the base camp visit itself.

This is a serious high-altitude trek, not a sightseeing trip. Two nights in Namche, a rest day in Dingboche and a conservative schedule matter more than fitness. Flights to Lukla are weather-dependent and delays are normal.`,
    highlights: `Sunrise on Kala Patthar with Everest, Nuptse and Pumori
Namche Bazaar's Saturday market and the Sherpa museum
Tengboche Monastery beneath Ama Dablam
Khumbu Glacier and the icefall viewpoint
Teahouse life: yak-dung stoves, garlic soup, early nights`,
    localFood: `Dal bhat with yak curry
Sherpa stew (shyakpa)
Garlic soup
Yak cheese and seabuckthorn tea
Tibetan bread with honey`,
    travelEssentials: `Down jacket rated to -15°C and a four-season sleeping bag
Travel insurance that covers helicopter evacuation above 5,000 m
Cash for the whole trek — the last ATM is in Namche
Water purification tablets or a filter bottle
Diamox only after a doctor's advice`,
    bestSeason: 'March–May, October–November',
    recommendedDurationDays: 12,
    difficultyLevel: 'difficult',
    costPerPersonPerDay: 7000,
    latitude: 27.9904,
    longitude: 86.925,
    imagePath: '/images/destinations/everest-base-camp.jpg',
  },
  {
    categorySlug: 'adventure',
    name: 'Annapurna Circuit & Thorong La',
    slug: 'annapurna-circuit',
    province: 'Gandaki',
    district: 'Lamjung / Manang / Mustang',
    shortDescription:
      'Subtropical valleys, pine forest, the arid Manang plateau and the Thorong La crossing into Muktinath — Nepal’s most varied long trek.',
    overview: `The circuit traditionally starts at Besisahar or Chame and follows the Marsyangdi valley upward. Rice terraces give way to oak and rhododendron, then to the dry, Tibetan-looking landscapes of Manang. The horizon shifts from Annapurna II and IV to Gangapurna and the vast wall of Tilicho.

Thorong La is the crux: a long, cold climb from High Camp, usually started before dawn. On the far side the trail drops steeply to Muktinath, then follows the Kali Gandaki — the world’s deepest gorge — past Kagbeni and Jomsom, with the option of soaking at Tatopani’s hot springs.

Since the road pushed up the valley, many trekkers walk the trail sections and take a jeep around the road stretches. That hybrid version fits comfortably into ten days and keeps the best scenery.`,
    highlights: `Thorong La at 5,416 m at sunrise
Manang village and Gangapurna lake
Muktinath temple and its 108 water spouts
Kagbeni's medieval mud-brick lanes
Tatopani hot springs after the pass`,
    localFood: `Thakali dal bhat
Apple pie in Marpha
Buckwheat bread
Yak steak in Manang
Tongba millet beer`,
    travelEssentials: `Layers for four seasons in one day
Microspikes in spring and late autumn
Sleeping bag rated to -10°C
ACAP permit and TIMS card before Besisahar
Extra day for weather at Thorong Phedi`,
    bestSeason: 'March–May, October–November',
    recommendedDurationDays: 10,
    difficultyLevel: 'challenging',
    costPerPersonPerDay: 6000,
    latitude: 28.6667,
    longitude: 84.0167,
    imagePath: '/images/destinations/annapurna-circuit.jpg',
  },
  {
    categorySlug: 'adventure',
    name: 'Upper Mustang & Lo Manthang',
    slug: 'upper-mustang',
    province: 'Gandaki',
    district: 'Mustang',
    shortDescription:
      'A restricted-area journey into a Tibetan plateau of ochre cliffs, sky caves, gompas and the walled capital of Lo Manthang.',
    overview: `Upper Mustang sits in the rain shadow of the Annapurnas, so it stays dry when the rest of Nepal is under monsoon cloud. The road and trail follow the Kali Gandaki north from Kagbeni through Chele, Syangboche, Ghami and Charang to Lo Manthang, a walled city of around 1,500 people.

The landscape is geological theatre: eroded ochre and grey cliffs, snow peaks on the horizon, and thousands of hand-cut caves in the rock faces. The Tiji festival in Lo Manthang, held in late spring, is a three-day masked dance that draws visitors from across Mustang.

Because it is a restricted area you need a permit and a registered guide, and the permit fee is substantial. Go with an operator that employs local Mustangi guides — this is one place where local knowledge genuinely changes the trip.`,
    highlights: `Lo Manthang's royal palace and Thubchen gompa
Sky caves at Chhoser and Jhong
Muktinath and Kagbeni on the way in
Tiji festival in late spring
Ochre cliffs and the Annapurna panorama from Ghami`,
    localFood: `Thakali sets
Dhindo with gundruk
Tibetan momos
Butter tea
Local apricot brandy`,
    travelEssentials: `Restricted-area permit arranged through a registered agency
Registered guide for the whole route
Warm layers and strong wind protection
Cash — there are no ATMs beyond Jomsom
Days of buffer for road and weather delays`,
    bestSeason: 'April–June, September–October',
    recommendedDurationDays: 8,
    difficultyLevel: 'challenging',
    costPerPersonPerDay: 8000,
    latitude: 29.1899,
    longitude: 83.955,
    imagePath: '/images/destinations/upper-mustang.jpg',
  },
  {
    categorySlug: 'adventure',
    name: 'Langtang Valley',
    slug: 'langtang-valley',
    province: 'Bagmati',
    district: 'Rasuwa',
    shortDescription:
      'The closest big-mountain trek to Kathmandu: bamboo and rhododendron forest, Tamang villages and the glacier moraine above Kyanjin Gompa.',
    overview: `A single road runs north from Kathmandu to Syabrubesi, and from there the trail climbs through Langtang National Park along the Langtang Khola. The forest is thick with bamboo at the bottom, opening into yak pastures and stone houses at Ghodatabela and Langtang village.

Kyanjin Gompa sits at 3,830 m beneath Langtang Lirung, with a cheese factory, a small monastery and two superb day hikes: Kyanjin Ri and Tserko Ri. The views from Tserko Ri take in the whole Langtang massif and, on clear days, into Tibet.

Langtang was devastated by the 2015 earthquake and the village was rebuilt further up the valley. Trekking here puts money directly into Tamang households still recovering, and the trail is noticeably quieter than Annapurna or Khumbu.`,
    highlights: `Tserko Ri sunrise at 4,984 m
Kyanjin Gompa and its yak cheese factory
Langtang village memorial
Bamboo and rhododendron forest in spring
Tamang homestays along the trail`,
    localFood: `Yak cheese
Tamang gundruk soup
Dal bhat with local greens
Buckwheat pancakes
Butter tea`,
    travelEssentials: `Langtang National Park permit and TIMS card
Warm sleeping bag — teahouses are basic above Lama Hotel
Rain shell even in autumn
Cash for the valley; no ATMs beyond Syabrubesi
Microspikes for winter and early spring`,
    bestSeason: 'March–May, October–November',
    recommendedDurationDays: 7,
    difficultyLevel: 'moderate',
    costPerPersonPerDay: 6000,
    latitude: 28.211,
    longitude: 85.567,
    imagePath: '/images/destinations/langtang-valley.jpg',
  },
  {
    categorySlug: 'sacred',
    name: 'Kathmandu Valley Heritage',
    slug: 'kathmandu-heritage',
    province: 'Bagmati',
    district: 'Kathmandu',
    shortDescription:
      'Durbar Square, Swayambhunath, Pashupatinath and Boudhanath — a dense, noisy, extraordinary week of temples, courtyards and street food.',
    overview: `The Kathmandu Valley holds seven UNESCO World Heritage monument zones, and you can reach most of them by taxi in under half an hour. Kathmandu Durbar Square is the historic royal seat; Swayambhunath sits on a hill above the city; Pashupatinath's cremation ghats line the Bagmati; and Boudhanath's white dome is the centre of Tibetan Buddhism in exile.

The pleasure of the valley is in the in-between: a Newari courtyard restaurant behind an unmarked door, a metalworker's shop in Patan's Mangal Bazaar, the smell of incense and diesel in Thamel. Give the valley three days at minimum and resist trying to see everything on the first.

Post-earthquake restoration is still visible, particularly around Kasthamandap and parts of Patan. Hiring a licensed guide for one day changes how much you understand — the square is not just old buildings, it is an active religious and civic space.`,
    highlights: `Boudhanath stupa at dusk with butter lamps
Pashupatinath's evening aarti
Swayambhunath's 365 steps and city view
Patan Durbar Square and the Patan Museum
Newari courtyard restaurants in Thamel and Patan`,
    localFood: `Newari bara (lentil pancake)
Chatamari rice crepe
Yomari
Buff momo
Juju dhau from Bhaktapur
Sekuwa grilled meat`,
    travelEssentials: `Comfortable shoes — the old quarters are car-free and uneven
Modest clothing for temples (shoulders and knees covered)
Small notes for entry fees and donations
A mask for dust in the dry season
Patience with traffic between monument zones`,
    bestSeason: 'February–April, October–December',
    recommendedDurationDays: 2,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 5000,
    latitude: 27.7172,
    longitude: 85.324,
    imagePath: '/images/destinations/kathmandu-heritage.jpg',
  },
  {
    categorySlug: 'lakes',
    name: 'Pokhara & Phewa Lake',
    slug: 'pokhara',
    province: 'Gandaki',
    district: 'Kaski',
    shortDescription:
      'Nepal’s easiest mountain town: a lake to paddle, a ridge to fly from, and Machhapuchhre filling the northern sky.',
    overview: `Pokhara is where the Annapurna treks begin and end, but it is worth days of its own. Phewa Lake is the centre: boats for hire, lakeside cafés, and the World Peace Pagoda on the ridge opposite. At sunrise the mountains reflect in the water when the air is still.

Sarangkot, a short climb or drive above town, is one of the world's great paragliding launches — a 30-minute tandem flight over the lake is the signature Pokhara experience. Davis Falls and Gupteshwor Cave are on the southern edge; Begnas and Rupa lakes are quieter alternatives half an hour east.

The city has become a digital-nomad and café hub, with good coffee, yoga studios and co-working spaces. It is also the natural base for Ghandruk, the Annapurna Base Camp trail and the Mardi Himal trek.`,
    highlights: `Sunrise over Phewa Lake with Machhapuchhre
Sarangkot paragliding launch
World Peace Pagoda
Davis Falls and Gupteshwor Cave
Begnas Lake and its quiet villages
Lakeside café and live-music evenings`,
    localFood: `Thakali dal bhat
Fresh lake fish
Newari khaja
Wood-fired pizza on Lakeside
Gurung Set`,
    travelEssentials: `Cash for boats and paragliding deposits
Light jacket for sunrise on the water
Comfortable shoes for the Peace Pagoda steps
Book paragliding with a licensed operator`,
    bestSeason: 'March–May, October–November',
    recommendedDurationDays: 2,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 4800,
    latitude: 28.2096,
    longitude: 83.9856,
    imagePath: '/images/destinations/pokhara.jpg',
  },
  {
    categorySlug: 'sacred',
    name: 'Lumbini',
    slug: 'lumbini',
    province: 'Lumbini',
    district: 'Rupandehi',
    shortDescription:
      'A quiet monastic zone of temples, monasteries and the Ashoka pillar marking the birthplace of Siddhartha Gautama.',
    overview: `Lumbini is a garden and pilgrimage site rather than a town. The sacred zone centres on the Maya Devi Temple, where a marker stone identifies the spot of the Buddha's birth, and the Ashoka pillar erected in 249 BCE. Around it, countries have built monasteries in their own architectural traditions — Korean, Thai, Myanmar, German, Chinese and more.

The site is flat and spread out; cycle rickshaws and electric carts make it manageable in the heat. The peaceful vibe is the point: most visitors stay one full day, and many wish they had two.

Lumbini is also a good base for the Terai: Tilaurakot (the ancient Shakya capital), Devdaha and the wetlands around Jagdishpur reservoir are all within an hour or two.`,
    highlights: `Maya Devi Temple and the marker stone
Ashoka pillar
The monastic zone's international temples
World Peace Pagoda
The sacred garden at sunrise`,
    localFood: `Terai thali
Litti chokha
Vegetarian monastery meals
Sweet curd
Lassi`,
    travelEssentials: `Sun hat and water — the site is flat and exposed
Bicycle or rickshaw to cover the monastic zone
Shoes you can slip off at temples
Quiet, modest clothing`,
    bestSeason: 'January–March, October–December',
    recommendedDurationDays: 1,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 3500,
    latitude: 27.4833,
    longitude: 83.2761,
    imagePath: '/images/destinations/lumbini.jpg',
  },
  {
    categorySlug: 'sacred',
    name: 'Janakpur',
    slug: 'janakpur',
    province: 'Madhesh',
    district: 'Dhanusha',
    shortDescription:
      'The Janaki Mandir, Mithila art and the ponds of Mithila — a Terai city with its own language, food and visual culture.',
    overview: `Janakpur is the setting of the Ramayana's Sita–Rama story and one of the most important Hindu pilgrimage sites in Nepal. The Janaki Mandir is a vast white marble temple built in 1910; nearby, the Ram Mandir and the sacred ponds of Dhanush Sagar and Ganga Sagar anchor the old town.

The city is also the heart of Mithila painting, a tradition originally painted on mud house walls by women and now practised on paper and cloth. You can visit workshops and buy directly from artists. Holi and Vivaha Panchami are the big festivals, drawing pilgrims from across the border.

Janakpur is hot and busy, and the tourist infrastructure is thin compared with Pokhara. That is part of the appeal: it feels like a real Terai city rather than a visitor enclave.`,
    highlights: `Janaki Mandir
Mithila painting workshops
Dhanush Sagar and Ganga Sagar ponds
Ram Mandir and the old bazaar
Vivaha Panchami festival`,
    localFood: `Maithili fish curry
Litti chokha
Malpua
Dahi-chura
Thekua`,
    travelEssentials: `Light cotton clothing — the Terai is hot
Mosquito repellent in summer
Cash — card acceptance is limited
Modest dress at temples`,
    bestSeason: 'January–March, October–December',
    recommendedDurationDays: 1,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 3200,
    latitude: 26.7288,
    longitude: 85.925,
    imagePath: '/images/destinations/janakpur.jpg',
  },
  {
    categorySlug: 'wildlife',
    name: 'Chitwan National Park',
    slug: 'chitwan',
    province: 'Bagmati',
    district: 'Chitwan',
    shortDescription:
      'Nepal’s best-known national park: one-horned rhinos, crocodiles, deer and — if you are lucky — a Bengal tiger, plus Tharu village life.',
    overview: `Chitwan protects a stretch of sal forest, tall elephant grass and riverine floodplain in the Terai. Sauraha, on the northern edge, is the main visitor hub: canoe trips on the Rapti, jeep safaris into the park, jungle walks and a very good elephant breeding centre nearby.

The one-horned rhino is the reliable star — you will almost certainly see several. Gharial and mugger crocodiles line the rivers, and the park is home to around 600 bird species. Tigers are present in good numbers but sightings are genuinely rare and never guaranteed.

The Tharu cultural show in Sauraha is touristy but enjoyable; a homestay in a Tharu village nearby is a better way to spend an evening. The park is hot and humid from April, and the grass is cut in winter, which improves visibility.`,
    highlights: `One-horned rhinos in the elephant grass
Canoe trip on the Rapti River
Gharial breeding centre
Tharu village and cultural show
Birdwatching — hornbills, kingfishers, eagles`,
    localFood: `Tharu thali
River fish
Dal bhat with mustard greens
Gundruk
Local rice beer (jaand)`,
    travelEssentials: `Neutral-coloured clothing for jungle walks
Insect repellent and long sleeves
Binoculars for birding
Park entry fee and guide
Never approach wildlife on foot without a guide`,
    bestSeason: 'January–April, October–December',
    recommendedDurationDays: 2,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 6000,
    latitude: 27.579,
    longitude: 84.494,
    imagePath: '/images/destinations/chitwan.jpg',
  },
  {
    categorySlug: 'lakes',
    name: 'Rara Lake',
    slug: 'rara-lake',
    province: 'Karnali',
    district: 'Mugu',
    shortDescription:
      'A high alpine lake ringed by pine and snow, reached by a rough road or a long walk through remote Mugu.',
    overview: `Rara is the largest lake in Nepal, at 2,990 m, and one of the least visited. The water shifts between turquoise and deep blue through the day; the surrounding Rara National Park protects spruce, pine and rhododendron forest and a small population of red panda.

Getting there is the adventure. Most visitors fly to Talcha (weather permitting) and walk two hours down to the lake, or drive the long, rough road from Jumla or Surkhet. That distance keeps crowds away and makes the calm feel earned.

There is a short trail around the lake that takes a full day, and side hikes to Murma Top and Chuchemara for views over the water. Lodges are simple; bring cash, a sleeping bag and patience with schedules.`,
    highlights: `The lake at dawn from the wooden bridge
Full-day circuit walk
Chuchemara viewpoint
Rara National Park forest
Village life in Mugu`,
    localFood: `Dal bhat with local beans
Dhindo
Dried yak meat
Wild honey
Butter tea`,
    travelEssentials: `Domestic flight or a very long jeep ride
Cash for the entire trip — no ATMs in Mugu
Warm sleeping bag and rain shell
Rara National Park entry permit
Flexible dates for weather delays`,
    bestSeason: 'May–June, September–October',
    recommendedDurationDays: 4,
    difficultyLevel: 'moderate',
    costPerPersonPerDay: 5000,
    latitude: 29.5297,
    longitude: 82.0886,
    imagePath: '/images/destinations/rara-lake.jpg',
  },
  {
    categorySlug: 'adventure',
    name: 'Ghandruk & the Annapurna foothills',
    slug: 'ghandruk',
    province: 'Gandaki',
    district: 'Kaski',
    shortDescription:
      'A short Gurung-village trek below Machhapuchhre, with stone lanes, terraced fields and one of the best close-up mountain views in Nepal.',
    overview: `Ghandruk sits on a ridge a few hours above Nayapul, looking straight at Annapurna South and Machhapuchhre. It is short enough for a long weekend and high enough to feel genuinely alpine.\n\nThe village is a working Gurung settlement, not a museum. Stone houses, mills and terraces are still in use, and the Gurung museum explains the area's trekking and military history. Sunrise from the upper viewpoint is the reason most people stay two nights.`,
    highlights: `Sunrise on Machhapuchhre and Annapurna South\nGurung village lanes and the local museum\nTerraced fields and rhododendron forest\nJhinu Danda hot springs\nEasy access from Pokhara`,
    localFood: `Dal bhat\nGurung bread\nDhindo with gundruk\nLocal honey and tea`,
    travelEssentials: `Broken-in walking shoes\nLight fleece and rain shell\nCash for teahouses\nACAP permit and TIMS card\nTwo to three days minimum`,
    bestSeason: 'March–May, October–December',
    recommendedDurationDays: 3,
    difficultyLevel: 'moderate',
    costPerPersonPerDay: 4500,
    latitude: 28.3772,
    longitude: 83.8074,
    imagePath: '/images/destinations/bhaktapur.jpg',
  },
  {
    categorySlug: 'sacred',
    name: 'Bhaktapur Durbar Square',
    slug: 'bhaktapur',
    province: 'Bagmati',
    district: 'Bhaktapur',
    shortDescription:
      'A medieval Newari city of brick lanes, temple squares and pottery courtyards that still works for a living.',
    overview: `Bhaktapur is the quietest of the three old Kathmandu Valley cities and the easiest to explore on foot. The Durbar Square, Taumadhi and Pottery Square are linked by car-free lanes lined with workshops and tea shops.\n\nAllow a full day. The 55-Window Palace, Nyatapola Temple and Dattatreya Square reward a slow walk, and the pottery quarter is best in the morning when the wheels are running.`,
    highlights: `Nyatapola Temple\n55-Window Palace and the National Art Gallery\nPottery Square\nDattatreya Square\nJuju Dhau, the city's famous yoghurt`,
    localFood: `Juju Dhau\nNewari khaja set\nBara (lentil pancake)\nChatamari\nLocal curd`,
    travelEssentials: `Comfortable walking shoes\nEntry ticket for the heritage zone\nCash for small workshops\nHalf a day to a full day`,
    bestSeason: 'February–April, October–December',
    recommendedDurationDays: 1,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 4000,
    latitude: 27.6722,
    longitude: 85.4278,
    imagePath: '/images/destinations/bandipur.jpg',
  },
  {
    categorySlug: 'sacred',
    name: 'Bandipur',
    slug: 'bandipur',
    province: 'Gandaki',
    district: 'Tanahun',
    shortDescription:
      'A restored Newari bazaar on a ridge above the Prithvi Highway, with wide Himalayan views and almost no traffic.',
    overview: `Bandipur's car-free main street runs along a ridge, lined with shuttered Newari houses and old trading family homes. It was a prosperous hill bazaar on the India–Tibet route and retains that compact, merchant-town feel.\n\nThe ridge walks to Thani Mai Temple and Ramkot take a couple of hours, and the sunset over the Annapurna range is the main event. It makes a calm overnight stop between Kathmandu and Pokhara.`,
    highlights: `Car-free bazaar street\nThani Mai Temple sunset\nAnnapurna and Manaslu views\nSiddha Gufa cave\nNewari architecture`,
    localFood: `Newari khaja set\nSel roti\nDal bhat\nLocal tea`,
    travelEssentials: `One night is enough\nWalking shoes for the ridge\nCash — few ATMs\nA jacket for the evening`,
    bestSeason: 'October–December, February–April',
    recommendedDurationDays: 2,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 3500,
    latitude: 27.9364,
    longitude: 84.4077,
    imagePath: '/images/destinations/shey-phoksundo.jpg',
  },
  {
    categorySlug: 'lakes',
    name: 'Shey Phoksundo Lake',
    slug: 'shey-phoksundo',
    province: 'Karnali',
    district: 'Dolpa',
    shortDescription:
      'An impossible turquoise lake in the hidden Dolpo, reached by a remote trek through pine forest and cliffside trails.',
    overview: `Shey Phoksundo sits at 3,611 m inside Nepal's largest national park. The trail from Juphal climbs through the Bheri valley and crosses a dramatic cliffside path above the lake's outlet before dropping into Ringmo village.\n\nThis is a remote, restricted-area trek. Permits are expensive, flights are weather-dependent and facilities are basic. The reward is one of the most striking lakes in the Himalaya and a Bon and Buddhist culture found nowhere else.`,
    highlights: `Phoksundo Lake's colour\nRingmo village and Bon monastery\nCliffside trail above the outlet\nShey Phoksundo National Park\nDolpo's remote culture`,
    localFood: `Dal bhat\nDhindo\nDried yak meat\nButter tea`,
    travelEssentials: `Restricted-area permit\nDomestic flight to Juphal\nWarm layers and a sleeping bag\nCash for the whole trek\nFlexible weather days`,
    bestSeason: 'May–June, September–October',
    recommendedDurationDays: 9,
    difficultyLevel: 'challenging',
    costPerPersonPerDay: 7500,
    latitude: 29.2138,
    longitude: 82.9573,
    imagePath: '/images/destinations/gosaikunda.jpg',
  },
  {
    categorySlug: 'lakes',
    name: 'Gosaikunda',
    slug: 'gosaikunda',
    province: 'Bagmati',
    district: 'Rasuwa',
    shortDescription:
      'A sacred alpine lake below the Laurebina pass, busy with pilgrims in August and quiet with trekkers in autumn.',
    overview: `The trek to Gosaikunda climbs from Dhunche through oak and rhododendron forest to a bowl of glacial lakes at 4,380 m. The largest lake is sacred to Shiva, and during Janai Purnima thousands of pilgrims make the climb.\n\nIt can be done as a short three-day trek or combined with Helambu and the Laurebina pass. Altitude is the main challenge: the last night is high, so a slow schedule matters more than fitness.`,
    highlights: `Gosaikunda lake and shrine\nJanai Purnima pilgrimage\nLaurebina pass views\nRhododendron forest\nLangtang and Ganesh Himal panorama`,
    localFood: `Dal bhat\nGarlic soup\nTibetan bread\nButter tea`,
    travelEssentials: `Warm layers and a rain shell\nSleeping bag for high teahouses\nWater purification\nCash for the trek\nSlow acclimatisation`,
    bestSeason: 'March–May, September–November',
    recommendedDurationDays: 4,
    difficultyLevel: 'moderate',
    costPerPersonPerDay: 5000,
    latitude: 28.0833,
    longitude: 85.4167,
    imagePath: '/images/destinations/nagarkot.jpg',
  },
  {
    categorySlug: 'lakes',
    name: 'Nagarkot',
    slug: 'nagarkot',
    province: 'Bagmati',
    district: 'Bhaktapur',
    shortDescription:
      'The Kathmandu Valley’s sunrise balcony: a ridge of hotels and terraced fields looking at the Himalaya.',
    overview: `Nagarkot is a short drive or a long walk from Bhaktapur, and its only real job is the view. On a clear morning the Himalayan skyline runs from Dhaulagiri to Everest, with the valley folded below.\n\nStay one night, wake before dawn and walk the ridge path towards Changunarayan. The village itself is unremarkable; the light and the panorama are the reason to come.`,
    highlights: `Sunrise over the Himalaya\nRidge walk to Changunarayan\nTerraced fields and pine forest\nKathmandu Valley panorama\nOne-night escape from the city`,
    localFood: `Dal bhat\nNewari snacks\nMomo\nLocal tea`,
    travelEssentials: `One night is enough\nWarm layer for sunrise\nCash for the ridge walk\nCheck the forecast for haze`,
    bestSeason: 'October–December, March–April',
    recommendedDurationDays: 1,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 4000,
    latitude: 27.7172,
    longitude: 85.5205,
    imagePath: '/images/destinations/bardia.jpg',
  },
  {
    categorySlug: 'wildlife',
    name: 'Bardia National Park',
    slug: 'bardia',
    province: 'Lumbini',
    district: 'Bardiya',
    shortDescription:
      'Wilder and quieter than Chitwan, with the best tiger odds in Nepal and vast sal forest along the Karnali river.',
    overview: `Bardia is what Chitwan was thirty years ago: fewer lodges, more forest and a genuine sense of remoteness. The park protects sal woodland, grassland and the Karnali floodplain, with tigers, rhinos, elephants and Gangetic dolphins.\n\nMost visits combine jeep drives, guided walks and a river trip. Book through a lodge that employs local guides, and allow at least three nights — wildlife is never on schedule.`,
    highlights: `Tiger tracking with local guides\nKarnali river trip\nSal forest and grassland\nTharu villages\nGangetic dolphin`,
    localFood: `Tharu set meal\nDal bhat\nRiver fish\nLocal rice beer`,
    travelEssentials: `Neutral-coloured clothing\nBinoculars\nInsect repellent\nPark permit through your lodge\nPatience for wildlife`,
    bestSeason: 'October–March',
    recommendedDurationDays: 3,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 6000,
    latitude: 28.3833,
    longitude: 81.5,
    imagePath: '/images/destinations/koshi-tappu.jpg',
  },
  {
    categorySlug: 'wildlife',
    name: 'Koshi Tappu Wildlife Reserve',
    slug: 'koshi-tappu',
    province: 'Koshi',
    district: 'Sunsari / Saptari',
    shortDescription:
      'A birdwatcher’s river delta in eastern Nepal, with grasslands, sandbars and hundreds of recorded species.',
    overview: `Koshi Tappu protects the floodplain of the Sapta Koshi, a shifting braided river with sandbars and tall grassland. It is the best birdwatching site in Nepal, with wild water buffalo and a long list of migratory species.\n\nAccess is from Kusaha, near the Koshi barrage. A jeep track and guided walks along the embankment are the usual ways in. It is a specialist stop, not a big-mammal safari, and pairs well with a journey to Ilam or the eastern hills.`,
    highlights: `Migratory and resident birdlife\nWild water buffalo\nSapta Koshi river and sandbars\nGrassland walks\nSunset from the embankment`,
    localFood: `Dal bhat\nRiver fish\nTharu and Maithili meals\nLocal tea`,
    travelEssentials: `Binoculars and a field guide\nNeutral clothing\nInsect repellent\nPark permit\nEarly mornings`,
    bestSeason: 'November–March',
    recommendedDurationDays: 2,
    difficultyLevel: 'easy',
    costPerPersonPerDay: 3500,
    latitude: 26.65,
    longitude: 87.0,
    imagePath: '/images/destinations/ghandruk.jpg',
  },
]

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description },
      create: category,
    })
  }

  for (const { categorySlug, ...destination } of destinations) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: categorySlug } })

    await prisma.destination.upsert({
      where: { slug: destination.slug },
      update: { ...destination, categoryId: category.id },
      create: { ...destination, categoryId: category.id, status: 'PUBLISHED' },
    })
  }

  const [categoryCount, destinationCount] = await Promise.all([
    prisma.category.count(),
    prisma.destination.count(),
  ])

  console.log(`Seed complete: ${categoryCount} categories, ${destinationCount} destinations.`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
