import { useEffect, useState } from 'react';
import { isFounder as checkIsFounder, FOUNDER_EMAIL } from '../lib/auth';

export { FOUNDER_EMAIL };

export const useFounderCheck = (): boolean => {
  const [isFounderUser, setIsFounderUser] = useState<boolean>(() => {
    return checkIsFounder();
  });

  useEffect(() => {
    setIsFounderUser(checkIsFounder());
  }, []);

  return isFounderUser;
};
