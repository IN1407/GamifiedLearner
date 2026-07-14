/**
 * The reading-comprehension library that powers the boss "second chance" gate.
 * Passages are grouped into five difficulty bands (see
 * progression.readingLevelForCheckpoint) and grow from very simple sentences to
 * richer paragraphs so the reading challenge scales with the campaign. Each
 * passage has exactly two multiple-choice questions.
 *
 * This is the learning heart of the game — the whole point is that kids read to
 * earn their second chance — so the pool is large enough that a full 30-boss
 * run need never repeat a passage.
 */
import type { Passage } from './types'

export const PASSAGES: Passage[] = [
  // ---- Level 1: very early readers, short sentences ----
  {
    id: 'l1-cat',
    title: 'The Sleepy Cat',
    level: 1,
    text: 'Milo is a small grey cat. He likes to sleep in the sun. Every morning he finds a warm spot by the window. When the sun moves, Milo moves too. He is always warm and happy.',
    questions: [
      { q: 'What colour is Milo?', options: ['Grey', 'Black', 'White'], answer: 0 },
      { q: 'Where does Milo like to sleep?', options: ['In the sun', 'Under the bed', 'In a box'], answer: 0 },
    ],
  },
  {
    id: 'l1-frog',
    title: 'The Green Frog',
    level: 1,
    text: 'A little frog lives by the pond. It is green and jumps very high. The frog eats bugs that fly by. At night it sings a happy song with its friends.',
    questions: [
      { q: 'Where does the frog live?', options: ['By the pond', 'In a tree', 'On a hill'], answer: 0 },
      { q: 'What does the frog eat?', options: ['Bugs', 'Fish', 'Leaves'], answer: 0 },
    ],
  },
  {
    id: 'l1-sun',
    title: 'The Bright Sun',
    level: 1,
    text: 'The sun is big and bright. It gives us light in the day. Plants need the sun to grow. When the sun goes down, the sky turns dark and the stars come out.',
    questions: [
      { q: 'When does the sun give us light?', options: ['In the day', 'At night', 'Never'], answer: 0 },
      { q: 'What comes out when the sky is dark?', options: ['The stars', 'The rain', 'The moon only'], answer: 0 },
    ],
  },
  {
    id: 'l1-dog',
    title: 'Rex the Dog',
    level: 1,
    text: 'Rex is a brown dog. He loves to run and play. Rex likes to chase a red ball in the park. After playing, he drinks water and takes a nap.',
    questions: [
      { q: 'What does Rex like to chase?', options: ['A red ball', 'A cat', 'A car'], answer: 0 },
      { q: 'What does Rex do after playing?', options: ['Takes a nap', 'Eats a bone', 'Goes to school'], answer: 0 },
    ],
  },
  {
    id: 'l1-rain',
    title: 'A Rainy Day',
    level: 1,
    text: 'Today it is raining. The rain falls from grey clouds. Ben wears his boots and coat. He jumps in the puddles and laughs. Rain helps the flowers grow.',
    questions: [
      { q: 'What does Ben wear in the rain?', options: ['Boots and a coat', 'A hat only', 'Shorts'], answer: 0 },
      { q: 'What does the rain help grow?', options: ['The flowers', 'The rocks', 'The cars'], answer: 0 },
    ],
  },
  {
    id: 'l1-bird',
    title: 'The Little Bird',
    level: 1,
    text: 'A little bird builds a nest in the tree. She uses twigs and soft grass. Soon she lays three small eggs. The bird keeps the eggs warm until they hatch.',
    questions: [
      { q: 'What does the bird build?', options: ['A nest', 'A house', 'A boat'], answer: 0 },
      { q: 'How many eggs does she lay?', options: ['Three', 'Five', 'One'], answer: 0 },
    ],
  },

  // ---- Level 2: short paragraphs, simple facts ----
  {
    id: 'l2-bees',
    title: 'Busy Bees',
    level: 2,
    text: 'Bees are small insects that live together in a hive. They fly from flower to flower to collect a sweet liquid called nectar. Bees turn the nectar into honey. While they work, bees also help flowers grow by moving pollen from one plant to another.',
    questions: [
      { q: 'What do bees collect from flowers?', options: ['Nectar', 'Water', 'Sand'], answer: 0 },
      { q: 'How do bees help flowers?', options: ['By moving pollen', 'By eating them', 'By digging holes'], answer: 0 },
    ],
  },
  {
    id: 'l2-moon',
    title: 'The Moon',
    level: 2,
    text: 'The moon is a large rocky ball that circles the Earth. It does not make its own light. Instead, it shines because sunlight bounces off its surface. The moon looks different each night, changing from a thin curve to a full circle and back again.',
    questions: [
      { q: 'Why does the moon shine?', options: ['Sunlight bounces off it', 'It is on fire', 'It has lamps'], answer: 0 },
      { q: 'What does the moon circle?', options: ['The Earth', 'The Sun', 'Mars'], answer: 0 },
    ],
  },
  {
    id: 'l2-turtle',
    title: 'Sea Turtles',
    level: 2,
    text: 'Sea turtles spend almost all of their lives in the ocean. They are strong swimmers with flippers instead of feet. Female turtles come onto sandy beaches to lay their eggs. When the baby turtles hatch, they crawl quickly to the water and swim away.',
    questions: [
      { q: 'What do sea turtles have instead of feet?', options: ['Flippers', 'Paws', 'Wheels'], answer: 0 },
      { q: 'Why do female turtles come onto the beach?', options: ['To lay eggs', 'To sleep', 'To eat sand'], answer: 0 },
    ],
  },
  {
    id: 'l2-tree',
    title: 'How Trees Grow',
    level: 2,
    text: 'A tree begins as a tiny seed. With water, sunlight, and good soil, the seed sprouts and grows roots. The roots hold the tree in place and drink water from the ground. Over many years the tree grows tall, and its leaves make food from sunlight.',
    questions: [
      { q: 'What does a tree begin as?', options: ['A tiny seed', 'A branch', 'A leaf'], answer: 0 },
      { q: 'What do the roots do?', options: ['Drink water from the ground', 'Make honey', 'Fly away'], answer: 0 },
    ],
  },
  {
    id: 'l2-penguin',
    title: 'Penguins',
    level: 2,
    text: 'Penguins are birds, but they cannot fly. They live in cold places and are excellent swimmers. Their thick feathers and a layer of fat keep them warm in icy water. Penguins slide on their bellies across the ice to move quickly.',
    questions: [
      { q: 'Can penguins fly?', options: ['No', 'Yes', 'Only at night'], answer: 0 },
      { q: 'What keeps penguins warm?', options: ['Thick feathers and fat', 'Warm hats', 'Fire'], answer: 0 },
    ],
  },
  {
    id: 'l2-volcano',
    title: 'Volcanoes',
    level: 2,
    text: 'A volcano is a mountain with an opening at the top. Deep inside the Earth it is so hot that rock melts into a liquid called magma. When pressure builds up, the volcano erupts and the magma bursts out. Once it reaches the surface, the liquid rock is called lava.',
    questions: [
      { q: 'What is melted rock inside the Earth called?', options: ['Magma', 'Water', 'Ice'], answer: 0 },
      { q: 'What is the liquid rock called once it reaches the surface?', options: ['Lava', 'Snow', 'Mud'], answer: 0 },
    ],
  },

  // ---- Level 3: longer paragraphs, cause and effect ----
  {
    id: 'l3-water',
    title: 'The Water Cycle',
    level: 3,
    text: 'Water is always moving in a journey called the water cycle. The sun heats water in oceans and lakes, turning it into an invisible gas called water vapour that rises into the sky. High up where the air is cold, the vapour cools and forms tiny droplets that gather into clouds. When the droplets grow heavy, they fall back to the ground as rain or snow, and the journey begins again.',
    questions: [
      { q: 'What turns water into water vapour?', options: ['Heat from the sun', 'The wind', 'The moon'], answer: 0 },
      { q: 'What happens when droplets in a cloud grow heavy?', options: ['They fall as rain or snow', 'They disappear', 'They turn into rocks'], answer: 0 },
    ],
  },
  {
    id: 'l3-dinosaur',
    title: 'Dinosaur Clues',
    level: 3,
    text: 'Dinosaurs lived on Earth millions of years before people existed. We know about them because they left behind fossils, which are the hardened remains or prints of living things buried in rock. Scientists called palaeontologists carefully dig up these fossils and study them. By measuring bones and teeth, they can guess how big a dinosaur was and whether it ate plants or meat.',
    questions: [
      { q: 'How do we know dinosaurs existed?', options: ['They left behind fossils', 'People saw them', 'From photographs'], answer: 0 },
      { q: 'What can scientists learn from a dinosaur’s teeth?', options: ['Whether it ate plants or meat', 'Its favourite colour', 'Its name'], answer: 0 },
    ],
  },
  {
    id: 'l3-magnet',
    title: 'Magnets',
    level: 3,
    text: 'A magnet is a special object that can pull certain metals toward it, like iron and steel. Every magnet has two ends called poles: a north pole and a south pole. When you bring two magnets close, opposite poles pull together, but two poles that are the same push each other away. This invisible pushing and pulling is called magnetism.',
    questions: [
      { q: 'What are the two ends of a magnet called?', options: ['Poles', 'Sides', 'Corners'], answer: 0 },
      { q: 'What happens when two of the same poles meet?', options: ['They push each other away', 'They pull together', 'Nothing happens'], answer: 0 },
    ],
  },
  {
    id: 'l3-spider',
    title: 'Spider Webs',
    level: 3,
    text: 'Many spiders build webs to catch their food. A spider makes silk inside its body and spins it into thin, sticky threads. It carefully weaves these threads into a web, often shaped like a wheel. When an insect flies into the web, it gets stuck. The spider feels the web shake and hurries over to catch its meal.',
    questions: [
      { q: 'Where does a spider make its silk?', options: ['Inside its body', 'In a factory', 'Under a rock'], answer: 0 },
      { q: 'How does a spider know an insect is caught?', options: ['It feels the web shake', 'It hears a bell', 'It smells it'], answer: 0 },
    ],
  },
  {
    id: 'l3-recycle',
    title: 'Why We Recycle',
    level: 3,
    text: 'Recycling means turning used items into new ones instead of throwing them away. When we recycle paper, glass, and plastic, factories can melt or mash them down and make fresh products. This saves energy and means we cut down fewer trees and dig up less material from the Earth. Recycling also keeps our rivers and parks cleaner by reducing rubbish.',
    questions: [
      { q: 'What does recycling do with used items?', options: ['Turns them into new ones', 'Buries them forever', 'Sends them to space'], answer: 0 },
      { q: 'How does recycling help nature?', options: ['Fewer trees are cut down', 'It makes more rubbish', 'It uses more energy'], answer: 0 },
    ],
  },
  {
    id: 'l3-heart',
    title: 'Your Amazing Heart',
    level: 3,
    text: 'Your heart is a strong muscle about the size of your fist, and it never stops working. Its job is to pump blood all around your body through tubes called blood vessels. The blood carries oxygen and food to every part of you, keeping you alive and full of energy. When you run or play, your heart beats faster to send blood more quickly.',
    questions: [
      { q: 'What is the job of the heart?', options: ['To pump blood around the body', 'To help you think', 'To digest food'], answer: 0 },
      { q: 'Why does your heart beat faster when you run?', options: ['To send blood more quickly', 'To keep you warm', 'To make noise'], answer: 0 },
    ],
  },

  // ---- Level 4: richer vocabulary, multiple ideas ----
  {
    id: 'l4-rainforest',
    title: 'Life in the Rainforest',
    level: 4,
    text: 'Tropical rainforests are among the busiest places on Earth. Warm temperatures and heavy rain all year round allow an astonishing variety of plants and animals to thrive there. The forest grows in layers: tall trees form a leafy roof called the canopy, while smaller plants live in the shady world below. More than half of all the animal and plant species on the planet are believed to live in rainforests, even though these forests cover only a small part of the land.',
    questions: [
      { q: 'What is the leafy roof of the rainforest called?', options: ['The canopy', 'The floor', 'The river'], answer: 0 },
      { q: 'Why can so many living things thrive in rainforests?', options: ['Warm temperatures and heavy rain all year', 'Cold and dry weather', 'There is no sunlight'], answer: 0 },
    ],
  },
  {
    id: 'l4-electricity',
    title: 'The Power of Electricity',
    level: 4,
    text: 'Electricity is a form of energy that powers much of the modern world, from lamps and phones to trains and hospitals. It is produced in power stations, often by spinning huge magnets inside coils of wire. The electricity then travels along cables to reach homes and schools. Because electricity can be dangerous, wires are wrapped in materials such as plastic that do not let the current pass through, keeping people safe.',
    questions: [
      { q: 'Where is electricity often produced?', options: ['In power stations', 'In the ocean', 'Inside clouds'], answer: 0 },
      { q: 'Why are wires wrapped in plastic?', options: ['Plastic stops the current from passing through', 'To make them colourful', 'To make them heavier'], answer: 0 },
    ],
  },
  {
    id: 'l4-egypt',
    title: 'The Pyramids of Egypt',
    level: 4,
    text: 'Thousands of years ago, the ancient Egyptians built enormous stone pyramids as tombs for their kings, who were called pharaohs. The largest, the Great Pyramid of Giza, was made from more than two million heavy stone blocks. Workers had no modern machines, so they dragged the blocks on sledges and used ramps to raise them into place. The Egyptians believed the pyramids would help their pharaohs journey safely into the afterlife.',
    questions: [
      { q: 'Why did the Egyptians build the pyramids?', options: ['As tombs for their pharaohs', 'As schools', 'As markets'], answer: 0 },
      { q: 'How did workers move the heavy blocks?', options: ['They dragged them on sledges and used ramps', 'They used trucks', 'They flew them'], answer: 0 },
    ],
  },
  {
    id: 'l4-migration',
    title: 'The Great Migration',
    level: 4,
    text: 'Every year, some animals travel enormous distances in a journey called migration. In East Africa, more than a million wildebeest move in a giant loop across the plains, always following the rains that make fresh grass grow. Along the way they must cross rivers full of dangers. Migration is exhausting and risky, but it lets the animals find the food and water they need to survive throughout the year.',
    questions: [
      { q: 'What do the wildebeest follow on their journey?', options: ['The rains that grow fresh grass', 'The setting sun', 'A single leader for life'], answer: 0 },
      { q: 'Why do animals migrate despite the dangers?', options: ['To find food and water they need', 'To take a holiday', 'To avoid sleeping'], answer: 0 },
    ],
  },
  {
    id: 'l4-invention',
    title: 'The Printing Press',
    level: 4,
    text: 'Long ago, every book had to be copied out slowly by hand, which meant books were rare and expensive. In the 1400s, a man named Johannes Gutenberg built a machine called the printing press. It used small metal letters that could be arranged, coated in ink, and pressed onto paper again and again. Suddenly books could be made quickly and cheaply, so more people learned to read and new ideas spread across the world.',
    questions: [
      { q: 'How were books made before the printing press?', options: ['Copied out slowly by hand', 'Printed by machines', 'Grown on trees'], answer: 0 },
      { q: 'What was one result of the printing press?', options: ['More people learned to read', 'Books became rarer', 'People stopped writing'], answer: 0 },
    ],
  },
  {
    id: 'l4-coral',
    title: 'Coral Reefs',
    level: 4,
    text: 'A coral reef may look like colourful rock, but it is actually built by millions of tiny living creatures called coral polyps. Each polyp has a soft body and builds a hard skeleton around itself for protection. Over hundreds of years these skeletons pile up to form a huge reef. Reefs are sometimes called the rainforests of the sea because they shelter a quarter of all ocean animals, giving them places to hide, feed, and raise their young.',
    questions: [
      { q: 'What builds a coral reef?', options: ['Tiny creatures called coral polyps', 'Ocean waves', 'Melting ice'], answer: 0 },
      { q: 'Why are reefs called the rainforests of the sea?', options: ['They shelter a huge number of ocean animals', 'They are made of wood', 'They grow above the water'], answer: 0 },
    ],
  },

  // ---- Level 5: dense paragraphs, inference required ----
  {
    id: 'l5-space',
    title: 'Journey to the Planets',
    level: 5,
    text: 'Our solar system is an enormous family of worlds circling a single star, the Sun. The four planets closest to the Sun—Mercury, Venus, Earth, and Mars—are relatively small and made mostly of rock. Far beyond them lie the giants: Jupiter and Saturn, made largely of gas, and the cold, distant worlds of Uranus and Neptune. Because these outer planets are so far away, a spacecraft leaving Earth may travel for years before it arrives. Scientists must plan such missions with great care, using the pull of a planet’s gravity to fling their probes onward and save precious fuel.',
    questions: [
      { q: 'What are the four planets closest to the Sun mostly made of?', options: ['Rock', 'Gas', 'Ice only'], answer: 0 },
      { q: 'How do scientists help a spacecraft travel farther while saving fuel?', options: ['They use a planet’s gravity to fling it onward', 'They add more seats', 'They wait for summer'], answer: 0 },
    ],
  },
  {
    id: 'l5-brain',
    title: 'The Learning Brain',
    level: 5,
    text: 'Your brain is made of billions of tiny cells called neurons that pass messages to one another using quick bursts of electricity and chemicals. When you practise something new—a piece of music, a sport, or reading—the connections between the neurons involved grow stronger, a little like a path becoming clearer the more often it is walked. This is why difficult tasks feel easier with practice: you are literally reshaping your brain. Scientists call this remarkable ability to change and improve "neuroplasticity."',
    questions: [
      { q: 'What happens to connections between neurons when you practise?', options: ['They grow stronger', 'They disappear', 'They stay exactly the same'], answer: 0 },
      { q: 'What is the brain’s ability to change with practice called?', options: ['Neuroplasticity', 'Gravity', 'Migration'], answer: 0 },
    ],
  },
  {
    id: 'l5-antarctica',
    title: 'The Frozen Continent',
    level: 5,
    text: 'Antarctica, at the very bottom of the world, is the coldest, windiest, and driest continent on Earth. Almost the entire land is buried beneath a sheet of ice that in places is more than four kilometres thick. Surprisingly, so little snow actually falls there that Antarctica is classed as a desert. No country owns this vast wilderness. Instead, many nations agreed long ago to share it peacefully and use it only for science, sending researchers to study its ice, weather, and wildlife.',
    questions: [
      { q: 'Why is Antarctica classed as a desert?', options: ['Very little snow actually falls there', 'It is covered in sand', 'It is extremely hot'], answer: 0 },
      { q: 'How is Antarctica governed?', options: ['Many nations share it peacefully for science', 'One country owns all of it', 'No one is allowed to study it'], answer: 0 },
    ],
  },
  {
    id: 'l5-language',
    title: 'How Languages Change',
    level: 5,
    text: 'Languages are not fixed; they change slowly over time as they are passed from one generation to the next. New words are invented for new ideas and inventions, while old words fall out of use or shift their meaning entirely. Sometimes people who speak the same language but live far apart begin to speak so differently that, after many centuries, their ways of talking become separate languages altogether. This is how a single ancient language long ago gave rise to related tongues such as Spanish, French, and Italian.',
    questions: [
      { q: 'Why are new words invented?', options: ['For new ideas and inventions', 'To confuse people', 'Because old words are banned'], answer: 0 },
      { q: 'How can one language become several?', options: ['Separated speakers slowly talk differently over centuries', 'A king orders it in a day', 'The weather changes it'], answer: 0 },
    ],
  },
  {
    id: 'l5-lighthouse',
    title: 'The Keeper of the Light',
    level: 5,
    text: 'For centuries, lighthouses have stood on dangerous coasts to guide ships safely through the dark. Before electricity, a lighthouse keeper had a demanding job: each night the keeper climbed a winding staircase to light the lamp, then trimmed its wick and polished the glass so the beam would shine as far as possible out to sea. Sailors far from shore watched for that steady, sweeping light, using its flashes to work out exactly where they were and to steer clear of hidden rocks.',
    questions: [
      { q: 'What was one of the lighthouse keeper’s nightly tasks?', options: ['Lighting the lamp and polishing the glass', 'Steering the ships', 'Catching fish'], answer: 0 },
      { q: 'How did sailors use the lighthouse beam?', options: ['To work out where they were and avoid rocks', 'To catch fish at night', 'To keep warm'], answer: 0 },
    ],
  },
  {
    id: 'l5-photosynthesis',
    title: 'How Plants Make Food',
    level: 5,
    text: 'Unlike animals, green plants make their own food in a process called photosynthesis. Inside their leaves is a green substance called chlorophyll, which captures energy from sunlight. Using that energy, the plant combines water drawn up from its roots with a gas called carbon dioxide taken from the air, turning them into sugar for food. As it works, the plant releases oxygen—the very gas that people and animals need to breathe. In this quiet way, plants feed themselves and, at the same time, help keep every other living thing alive.',
    questions: [
      { q: 'What does chlorophyll do?', options: ['Captures energy from sunlight', 'Colours the flowers', 'Makes the plant grow tall'], answer: 0 },
      { q: 'What gas do plants release that animals need?', options: ['Oxygen', 'Carbon dioxide', 'Smoke'], answer: 0 },
    ],
  },
]

/** All passages at a given reading level. */
export function passagesForLevel(level: 1 | 2 | 3 | 4 | 5): Passage[] {
  return PASSAGES.filter((p) => p.level === level)
}

/**
 * Deterministically pick a passage for a checkpoint + attempt. Attempts advance
 * through the band so a retry shows a *different* passage rather than punishing
 * the reader with the same one.
 */
export function pickPassage(level: 1 | 2 | 3 | 4 | 5, seed: number): Passage {
  const pool = passagesForLevel(level)
  if (pool.length === 0) return PASSAGES[0]
  return pool[((seed % pool.length) + pool.length) % pool.length]
}
