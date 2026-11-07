import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from 'firebase/auth';
import {
  MoneyManager,
  MONEY_MANAGER_SEO,
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  getMoneyManagerAuth,
  setCachedGoogleAccessToken,
  checkGoogleRedirectResult,
  createGoogleDriveAuthProvider,
  googleDriveSignIn,
} from '../../tools/MoneyManager';

export {
  MoneyManager,
  MONEY_MANAGER_SEO,
  SCOPES,
  DRIVE_APPDATA_SCOPE,
  getMoneyManagerAuth,
  setCachedGoogleAccessToken,
  checkGoogleRedirectResult,
  createGoogleDriveAuthProvider,
  googleDriveSignIn,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
};
export default MoneyManager;

