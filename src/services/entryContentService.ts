import type { ImageSourcePropType } from 'react-native';

export type EntrySlide = {
  id: string;
  image: ImageSourcePropType;
  label?: string;
  caption?: string;
  captionSub?: string;
};

let entrySlides: EntrySlide[] = [
  {
    id: 'entry-photo-1',
    image: require('../../assets/images/prototype-three-finger-back-pose-background.png'),
    label: 'Welcome Photo 1',
    caption: 'Welcome to Marvel Gym',
    captionSub: 'Where champions are made.',
  },
  {
    id: 'entry-photo-2',
    image: require('../../assets/images/prototype-three-finger-back-pose-background.png'),
    label: 'Welcome Photo 2',
    caption: 'Your journey starts here.',
    captionSub: 'Elevate your performance. Every session counts.',
  },
];

let signInWallpaper: EntrySlide = {
  id: 'sign-in-wallpaper',
  image: require('../../image.png'),
  label: 'Sign In Wallpaper',
};

export const getEntrySlides = async (): Promise<EntrySlide[]> => {
  return entrySlides;
};

export const replaceEntrySlides = async (
  slides: EntrySlide[],
): Promise<EntrySlide[]> => {
  entrySlides = slides;

  return entrySlides;
};

export const getWelcomePhotos = async (): Promise<EntrySlide[]> => {
  return entrySlides;
};

export const addWelcomePhoto = async (input: {
  image: ImageSourcePropType;
  label?: string;
}): Promise<EntrySlide> => {
  const slide: EntrySlide = {
    id: `entry-photo-${Date.now().toString(36)}`,
    image: input.image,
    label: input.label,
  };

  entrySlides = [...entrySlides, slide];

  return slide;
};

export const updateWelcomePhoto = async (
  photoId: string,
  updates: Partial<Pick<EntrySlide, 'image' | 'label'>>,
): Promise<EntrySlide | undefined> => {
  let updatedSlide: EntrySlide | undefined;

  entrySlides = entrySlides.map((slide) => {
    if (slide.id !== photoId) {
      return slide;
    }

    updatedSlide = { ...slide, ...updates };

    return updatedSlide;
  });

  return updatedSlide;
};

export const deleteWelcomePhoto = async (
  photoId: string,
): Promise<EntrySlide | undefined> => {
  const deletedSlide = entrySlides.find((slide) => slide.id === photoId);

  entrySlides = entrySlides.filter((slide) => slide.id !== photoId);

  return deletedSlide;
};

export const reorderWelcomePhotos = async (
  photoIds: string[],
): Promise<EntrySlide[]> => {
  const orderedSlides = photoIds
    .map((photoId) => entrySlides.find((slide) => slide.id === photoId))
    .filter((slide): slide is EntrySlide => Boolean(slide));
  const remainingSlides = entrySlides.filter((slide) => !photoIds.includes(slide.id));

  entrySlides = [...orderedSlides, ...remainingSlides];

  return entrySlides;
};

export const getSignInWallpaper = async (): Promise<EntrySlide> => {
  return signInWallpaper;
};

export const updateSignInWallpaper = async (input: {
  image: ImageSourcePropType;
  label?: string;
}): Promise<EntrySlide> => {
  signInWallpaper = {
    ...signInWallpaper,
    image: input.image,
    label: input.label ?? signInWallpaper.label,
  };

  return signInWallpaper;
};

export const entryContentService = {
  getEntrySlides,
  replaceEntrySlides,
  getWelcomePhotos,
  addWelcomePhoto,
  updateWelcomePhoto,
  deleteWelcomePhoto,
  reorderWelcomePhotos,
  getSignInWallpaper,
  updateSignInWallpaper,
};
