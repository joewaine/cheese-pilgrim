export type DemoReview = {
  id: string;
  stopId: string;
  name: string;
  text: string;
  rating: number;
  location: string;
  date: string;
  photoUrl: string;
  videoUrl?: string;
  duration?: number;
  demo: true;
};
export const demoReviews: DemoReview[] = [
  {
    id: "demo-gruyere",
    stopId: "gruyere",
    name: "Margot & Jules",
    text: "We took our little picnic up into the hills. The Gruyère had a lovely nutty finish, and the sourdough was all it needed. A cup of oolong for Jules, a glass of Chasselas for me. Our kind of afternoon.",
    rating: 5,
    location: "A picnic above Gruyères",
    date: "2026-06-14T16:30:00.000Z",
    photoUrl: "/images/cheese.jpg",
    videoUrl: "/videos/sample-field-note.mp4",
    duration: 24,
    demo: true,
  },
  {
    id: "demo-comte",
    stopId: "comte",
    name: "Margot & Jules",
    text: "Tried two ages side by side and kept going back to the older one. Toasted hazelnuts, a tiny crunch, and a finish that seemed to last all the way back to the van. Next time: more walnut bread.",
    rating: 5,
    location: "An afternoon in Poligny",
    date: "2026-06-12T17:00:00.000Z",
    photoUrl: "/images/france.jpg",
    demo: true,
  },
  {
    id: "demo-cheddar",
    stopId: "cheddar",
    name: "Margot & Jules",
    text: "Our first page in the journal. A crumbly cheddar, a few oatcakes, and a bottle of cider to share. You don’t need a grand plan to have a very good evening.",
    rating: 4,
    location: "A little shop in Somerset",
    date: "2026-06-08T18:00:00.000Z",
    photoUrl: "/images/cheese.jpg",
    demo: true,
  },
];
