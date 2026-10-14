import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { NetworkSyncBanner } from '../components/NetworkSyncBanner';
import { AIAnalysisScreen } from '../screens/AIAnalysisScreen';
import { CameraCaptureScreen } from '../screens/CameraCaptureScreen';
import { DetectionResultScreen } from '../screens/DetectionResultScreen';
import { EmergencyAlertScreen } from '../screens/EmergencyAlertScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ImagePreviewScreen } from '../screens/ImagePreviewScreen';
import { InspectionDetailsScreen } from '../screens/InspectionDetailsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OfflineEmergencyModeScreen } from '../screens/OfflineEmergencyModeScreen';
import { OfflineIncidentQueueScreen } from '../screens/OfflineIncidentQueueScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SeverityResultScreen } from '../screens/SeverityResultScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { StartInspectionScreen } from '../screens/StartInspectionScreen';
import { MainTabParamList, RootStackParamList } from '../types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'InspectTab') {
            iconName = focused ? 'scan' : 'scan-outline';
          } else if (route.name === 'HistoryTab') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'ReportsTab') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        }
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="InspectTab"
        component={StartInspectionScreen}
        options={{ tabBarLabel: 'Inspect' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{ tabBarLabel: 'History' }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{ tabBarLabel: 'Reports' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <NetworkSyncBanner
          onPressBanner={(action) => {
            if (navigationRef.isReady()) {
              if (action === 'QUEUE') {
                navigationRef.navigate('OfflineIncidentQueue');
              } else {
                navigationRef.navigate('OfflineEmergencyMode');
              }
            }
          }}
        />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0F172A' },
            animation: 'fade'
          }}
        >
          {/* Auth & Splash */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* Main Tab Container */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          {/* Inspection Flow */}
          <Stack.Screen name="StartInspection" component={StartInspectionScreen} />
          <Stack.Screen
            name="CameraCapture"
            component={CameraCaptureScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="ImagePreview" component={ImagePreviewScreen} />
          <Stack.Screen name="AIAnalysis" component={AIAnalysisScreen} />
          <Stack.Screen name="DetectionResult" component={DetectionResultScreen} />
          <Stack.Screen name="SeverityResult" component={SeverityResultScreen} />
          <Stack.Screen
            name="EmergencyAlert"
            component={EmergencyAlertScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          {/* Details & Queues */}
          <Stack.Screen name="InspectionHistory" component={HistoryScreen} />
          <Stack.Screen name="InspectionDetails" component={InspectionDetailsScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen
            name="OfflineEmergencyMode"
            component={OfflineEmergencyModeScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="OfflineIncidentQueue" component={OfflineIncidentQueueScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
      </View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    height: 64,
    paddingBottom: 8,
    paddingTop: 6
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700'
  }
});
