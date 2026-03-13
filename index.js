/**
 * @format
 */

import { AppRegistry } from 'react-native';
import '@react-native-firebase/analytics';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
import '@react-native-firebase/functions';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
