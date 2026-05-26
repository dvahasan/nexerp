import { useContext } from 'react';
import { TourContext } from '../context/TourContextObj';

export const useTour = () => useContext(TourContext);
