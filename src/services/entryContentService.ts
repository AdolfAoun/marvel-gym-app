import type { ImageSourcePropType } from 'react-native';

export type EntrySlide = {
  id: string;
  image: ImageSourcePropType;
};

let entrySlides: EntrySlide[] = [
  {
    id: 'entry-photo-1',
    image: require('../../assets/images/MarvelPhoto1.jpeg'),
  },
  {
    id: 'entry-photo-2',
    image: require('../../assets/images/MarvelPhoto2.png'),
  },
];

export const getEntrySlides = async (): Promise<EntrySlide[]> => {
  return entrySlides;
};

export const replaceEntrySlides = async (
  slides: EntrySlide[],
): Promise<EntrySlide[]> => {
  entrySlides = slides;

  return entrySlides;
};

export const entryContentService = {
  getEntrySlides,
  replaceEntrySlides,
};
