export type Property = {
  id: string
  title: string
  location: string
  price: string
  beds: number
  baths: number
  area: string
  image: string
  verified: boolean
}

export const properties: Property[] = [
  {
    id: "1",
    title: "4-Bedroom Duplex",
    location: "Lekki Phase 1, Lagos",
    price: "\u20a685,000,000",
    beds: 4,
    baths: 5,
    area: "420 sqm",
    image: "/properties/lekki-duplex.png",
    verified: true,
  },
  {
    id: "2",
    title: "3-Bedroom Apartment",
    location: "Ikeja GRA, Lagos",
    price: "\u20a642,500,000",
    beds: 3,
    baths: 3,
    area: "180 sqm",
    image: "/properties/ikeja-apartment.png",
    verified: true,
  },
  {
    id: "3",
    title: "3-Bedroom Bungalow",
    location: "Ajah, Lagos",
    price: "\u20a628,000,000",
    beds: 3,
    baths: 2,
    area: "300 sqm",
    image: "/properties/ajah-bungalow.png",
    verified: true,
  },
  {
    id: "4",
    title: "Luxury Penthouse",
    location: "Victoria Island, Lagos",
    price: "\u20a6165,000,000",
    beds: 5,
    baths: 6,
    area: "520 sqm",
    image: "/properties/vi-penthouse.png",
    verified: true,
  },
  {
    id: "5",
    title: "Modern Mini Flat",
    location: "Yaba, Lagos",
    price: "\u20a618,500,000",
    beds: 1,
    baths: 1,
    area: "65 sqm",
    image: "/properties/yaba-flat.png",
    verified: true,
  },
  {
    id: "6",
    title: "Terraced Townhouse",
    location: "Ikoyi, Lagos",
    price: "\u20a6120,000,000",
    beds: 4,
    baths: 4,
    area: "350 sqm",
    image: "/properties/ikoyi-terrace.png",
    verified: true,
  },
]
