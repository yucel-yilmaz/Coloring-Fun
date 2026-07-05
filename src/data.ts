import { Animal, GalleryItem } from './types';

export const ANIMALS: Animal[] = [
  {
    id: 'lion',
    name: 'Lion',
    nameTr: 'Aslan',
    lineArtUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqqo23cwNUGSLXp-9QxP8IVn3rumx7HQxfyqyzE1Bd1oz-4dGFW9aqzMMYFQaw0ruhFnhdWrd3FregKu0ABUSlAYoaP6cfutCQZ53TmL1-UBbYkY2u2BNnGIVxzZqovNDRsDtSHi0jtRCBaFeUfYeohwC1MilnCcjFWfcjcxPyHtufNZnVdkXiVxty7n3FmDka2tAJ7VvBiXOM7QvVOsCG38t4v8npP7ctUuE7lI59MibqjuUcVzPtWw2Kf4pTp66-i_-BGvezmbbl',
    cardBgColor: 'bg-[#ffd700]',
    category: 'animals',
    hoverBorderColor: 'group-hover:bg-[#705d00]'
  },
  {
    id: 'elephant',
    name: 'Elephant',
    nameTr: 'Fil',
    lineArtUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN9ED13VWMhEyb5wZFPlz0ZPhcBKnYa6hehbaZvybyh6iUhsUDRDzfZ-KcxDUpbBZ7-UQBYgiDjZRsfExaeh_1jNzntouTm4Tl12AuuncGK8xbqAgDBtv6VGd9QCXnw1WGgqwAH7ib-FJHCrdIl2ZwMxoih9tGGQQ7KB9Vua6XX4V0fwB6Z-IXeP7eTDf7QoPkQThOvAhnsTiiqOTa7j4qH_pPqPCWXKs8hzyP_N4rRaum3YS9lIx9HjOObk0B7CuZh93ecVOzJpMm',
    cardBgColor: 'bg-[#cbe6ff]',
    category: 'animals',
    hoverBorderColor: 'group-hover:bg-[#0001c0]'
  },
  {
    id: 'cat',
    name: 'Cat',
    nameTr: 'Kedi',
    lineArtUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAupw7Dy1W2eYGRLzvs45UD5JLFyS-G-7HSF-dt8Y2A875aDJGFTSSxyYe9m5yZohY8gZm4vngNQHHQjCNxsUHsusEY8Dl7muU6tERr8YPtFfNRtI_b2sP4U-bwLOJ0QkwM5PZuqluWpQ2p9fD14K5lWloJKE9P_wCBR37PhmgK_IX0OpWhCfKxl3djM0yICMVAgHJByxmypln1GN8V2oPX4Rttl0EvY1260__Y_ep4p5DPVh9cwXo1E-dx3Mz90S7dKv42JntaHx_G',
    cardBgColor: 'bg-[#ffceca]',
    category: 'animals',
    hoverBorderColor: 'group-hover:bg-[#ba1724]'
  },
  {
    id: 'dog',
    name: 'Dog',
    nameTr: 'Köpek',
    lineArtUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLtdDK9NDIrlnOr1dtJIaIbNVkKQlw6b3M1QT3CFjOqVh9qQLb9L09-tZRqErL5yo7DqB7i-cNqGvU-_UI2v5KxcJJHAMx7lZyUrleYeN5Enu87NRvD0bVxmju4mA1q_jxtieLmmsZpC5FA2sbT6wvn4IW3tMsRx0FpmyI8C1WDSx-UQhWDwjwR_5K-YoCUsIHgQMG_wdUff8Zmxm_UB_Gk_yOF0KB7uf4065Rdn6jvt0UaXF7Ly9zOcOQDTLLl3FyYLArlxBEYaHm',
    cardBgColor: 'bg-[#e6f2ff]',
    category: 'animals',
    hoverBorderColor: 'group-hover:bg-[#001e30]'
  },
  {
    id: 'dino',
    name: 'Dino',
    nameTr: 'Dinozor',
    lineArtUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzEH06AlFta2GYWMoGCun9BK88u6bXYdm1Y8Qn3BG3VP9GXadGqx5Hyy3sQDZw8NjX5Wwwenpp_q3DqLzFqWHBqPiOovt3Clf1jOVjv_qOuKOezgSAFFuW_QIs51DeobWSud57EpaC0cL5STbc2h9l2YoGC8uo8RhpEx9cC3K7S_f9ccVLCk0QTOdiEqc_zNRaQq_59JzBN-0HYf5J4vc7lU9QephV4Wbj2yIN1SyMh2YVd8g2dJ-7UqJ5UtTmc0JlSXQO2kkJNLSn',
    cardBgColor: 'bg-[#ecf4ff]',
    category: 'dinos',
    hoverBorderColor: 'group-hover:bg-[#705d00]'
  }
];

export const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Roaring Lion',
    animalId: 'lion',
    date: 'Oct 24, 2023',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMPGXaJdVTHs-6BlmV0nksp5wbVejRnrc5F2ueXgIkl0z3fopnDquMgiBwIP-4EP3R-vMtp7Hybz_utxgL9johYTzdqB92vWrgWQMLGGBI9C6WPp1gmlsQfUFZKNMeS6zrA7zssdpC2KkIsSCComnUJOWnI2t05j7EbZr3mE0AbSvNlY5WnhXwAHFDfkpUy_8XqzQuNCXlrZd2TXttjJDKJePLgDyTHN_PrmZZU104vBNF2wPcJQJC-XknRt-rdNlT8OGNHqiWdTcd',
    isStarred: true
  },
  {
    id: 'gal-2',
    title: 'Happy Elephant',
    animalId: 'elephant',
    date: 'Oct 22, 2023',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUOhYzIPFuNqMF1nRcsZWOeUnVdPpHG7QsevdLMiOodRcafKklibOHSRBp2qPPZFdE6stQu8MrQHiZymErNnhrKTL65e36ubIT53Eb6yUQdnigTShmcj9aRR9upcMXKdgZy1lr9t3mxKkH-xN1LDLalL4S3wtHy7guRWNfznJBQmonkTHRhbcslBKBjzRejuLI671_nZyXHu0cVecuC6L8AeJhBuJG1tT1xOTijUS-pG0R21-fwJpx_nDP8xmxk73wa2PnYLSWVtPN'
  },
  {
    id: 'gal-3',
    title: 'Swimming Turtle',
    animalId: 'turtle',
    date: 'Oct 20, 2023',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwjDgh2ffP5L9xoenuQsF2Gk6lZ7K9BkbMYe1LJYmaCecQk601DJ5SF1qrByJXvuWks5P4wi-O_We91g3gosxZogx_yrfqlIsaYtU9olyItl6VlziAiKAB-BRWvcCxuHQpxSfibs65nokSlBy-4lq4Why1Mebqms1uwJuexjjgxUAFz6GsoEZPkuQTm7D2KuIR15-8UIo2a0WUriMkPURfHxdlsAq5KD36Mt9Q3DolXS3OHbz7QfI-hPc10yGdOwGQv6y3jdAL-okC'
  },
  {
    id: 'gal-4',
    title: 'Space Rocket',
    animalId: 'rocket',
    date: 'Oct 18, 2023',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMU3hDUB0DJDkQRQEgNJ7Y9HiqBKO-I2FMygYS_2dMSrPXvxWmaR1BatqfUW-oB1el5X7TXeJZHiIrMBTP-TdY8IBDv5R3WRirIz-LdVyT3CARmFz4zsNQEwU6NUqHvKKud-LMM0vMfA4Kitr_N54RLxqr3nW_xTlO2toehdhyi6RrIAF_D6QC-DBHFBakR89fs5PljulzbI8a35DcbOAeSz3nKLUalgrPPmE8-3IzxUSR4yGj03kT8gbjSRfXFJpZjSH3JO37QmRl'
  },
  {
    id: 'gal-5',
    title: 'Green Dino',
    animalId: 'dino',
    date: 'Oct 15, 2023',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCzEH06AlFta2GYWMoGCun9BK88u6bXYdm1Y8Qn3BG3VP9GXadGqx5Hyy3sQDZw8NjX5Wwwenpp_q3DqLzFqWHBqPiOovt3Clf1jOVjv_qOuKOezgSAFFuW_QIs51DeobWSud57EpaC0cL5STbc2h9l2YoGC8uo8RhpEx9cC3K7S_f9ccVLCk0QTOdiEqc_zNRaQq_59JzBN-0HYf5J4vc7lU9QephV4Wbj2yIN1SyMh2YVd8g2dJ-7UqJ5UtTmc0JlSXQO2kkJNLSn'
  }
];

export const COLORS = [
  { hex: '#ffd700', name: 'Sarı', nameEn: 'Yellow' },
  { hex: '#0001c0', name: 'Mavi', nameEn: 'Blue' },
  { hex: '#ba1724', name: 'Kırmızı', nameEn: 'Red' },
  { hex: '#22c55e', name: 'Yeşil', nameEn: 'Green' },
  { hex: '#a855f7', name: 'Mor', nameEn: 'Purple' },
  { hex: '#f97316', name: 'Turuncu', nameEn: 'Orange' },
  { hex: '#ec4899', name: 'Pembe', nameEn: 'Pink' },
  { hex: '#14b8a6', name: 'Turkuaz', nameEn: 'Teal' },
  { hex: '#8b4513', name: 'Kahverengi', nameEn: 'Brown' },
  { hex: '#000000', name: 'Siyah', nameEn: 'Black' },
  { hex: '#ffffff', name: 'Beyaz', nameEn: 'White' }
];
