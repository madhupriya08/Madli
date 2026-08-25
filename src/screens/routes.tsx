import type { ReactNode } from 'react';
import { screenRegistry } from './registry';

import { LandingPage } from './marketing/LandingPage';
import { HowItWorksPage } from './marketing/HowItWorks';
import { GemOfTheTownPage } from './marketing/GemOfTheTown';
import { NeighbourhoodPage } from './marketing/NeighbourhoodPage';
import { LegalPage } from './marketing/LegalPage';

import { SplashScreen } from './onboarding/SplashScreen';
import { HomeScreen } from './onboarding/HomeScreen';
import { LocationPermissionScreen } from './onboarding/LocationPermissionScreen';
import { ManualAreaScreen } from './onboarding/ManualAreaScreen';
import { OutOfCoverageScreen } from './onboarding/OutOfCoverageScreen';
import { SignupScreen } from './onboarding/SignupScreen';
import { LoginScreen } from './onboarding/LoginScreen';
import { ForgotPasswordScreen } from './onboarding/ForgotPasswordScreen';
import { SearchEntryScreen } from './onboarding/SearchEntryScreen';

import { IntakeScreen } from './discovery/IntakeScreen';
import { FiltersScreen } from './discovery/FiltersScreen';
import { ResultsScreen } from './discovery/ResultsScreen';
import { PlaceDetailScreen } from './discovery/PlaceDetailScreen';
import { BridgeTapScreen } from './discovery/BridgeTapScreen';
import { MapScreen } from './discovery/MapScreen';
import { ShareSheetScreen } from './discovery/ShareSheetScreen';

import { BookmarksScreen } from './personal/BookmarksScreen';
import { SavedPlanDetailScreen } from './personal/SavedPlanDetailScreen';
import { LogVisitTriggerScreen } from './personal/LogVisitTriggerScreen';
import { LogVisitComparisonScreen } from './personal/LogVisitComparisonScreen';
import { LogVisitLandedScreen } from './personal/LogVisitLandedScreen';
import { SaveYourListGateScreen } from './personal/SaveYourListGateScreen';
import { RankingOnboardingScreen } from './personal/RankingOnboardingScreen';
import { PostVisitNudgeScreen } from './personal/PostVisitNudgeScreen';
import { MyRankedListScreen } from './personal/MyRankedListScreen';
import { ProfileScreen } from './personal/ProfileScreen';
import { SettingsScreen } from './personal/SettingsScreen';
import { ClaimBusinessLinkScreen } from './personal/ClaimBusinessLinkScreen';
import { NotificationSettingsScreen } from './personal/NotificationSettingsScreen';
import { PrivacySettingsScreen } from './personal/PrivacySettingsScreen';

import { ClaimRequestFormScreen } from './owner/ClaimRequestFormScreen';
import { ClaimStatusScreen } from './owner/ClaimStatusScreen';
import { OwnerEditListingScreen } from './owner/OwnerEditListingScreen';
import { OwnerProfileScreen } from './owner/OwnerProfileScreen';

import { AdminLoginScreen } from './admin/AdminLoginScreen';
import { AnalyticsDashboardScreen } from './admin/AnalyticsDashboardScreen';
import { CatalogueListScreen } from './admin/CatalogueListScreen';
import { CatalogueEditScreen } from './admin/CatalogueEditScreen';
import { BulkImportScreen } from './admin/BulkImportScreen';
import { RankingAndTrustScreen } from './admin/RankingAndTrustScreen';
import { GemSelectionScreen } from './admin/GemSelectionScreen';
import { BusinessClaimsQueueScreen } from './admin/BusinessClaimsQueueScreen';
import { ReportsAndModerationScreen } from './admin/ReportsAndModerationScreen';
import { RolesAccountsAuditScreen } from './admin/RolesAccountsAuditScreen';
import { LocationHistoryAccessScreen } from './admin/LocationHistoryAccessScreen';

import { PlaceholderScreen } from './PlaceholderScreen';
import { RootRoute } from './RootRoute';

const elementById: Record<string, ReactNode> = {
  S1: <LandingPage />,
  S2: <HowItWorksPage />,
  S3: <GemOfTheTownPage />,
  S4: <NeighbourhoodPage />,
  S5: <LegalPage />,

  S6: <SplashScreen />,
  S7: <HomeScreen />,
  S8: <LocationPermissionScreen />,
  S9: <ManualAreaScreen />,
  S10: <OutOfCoverageScreen />,
  S11: <SignupScreen />,
  S13: <LoginScreen />,
  S14: <ForgotPasswordScreen />,
  S52: <SearchEntryScreen />,

  S15: <IntakeScreen />,
  S16: <FiltersScreen door="eat" />,
  S17: <ResultsScreen door="eat" />,
  S18: <ResultsScreen door="explore" />,
  S19: <PlaceDetailScreen />,
  S20: <BridgeTapScreen />,
  S21: <MapScreen />,
  S22: <ShareSheetScreen />,

  S23: <BookmarksScreen />,
  S24: <SavedPlanDetailScreen />,
  S25: <LogVisitTriggerScreen />,
  S26: <LogVisitComparisonScreen />,
  S27: <LogVisitLandedScreen />,
  S28: <SaveYourListGateScreen />,
  S29: <RankingOnboardingScreen />,
  S30: <PostVisitNudgeScreen />,
  S31: <MyRankedListScreen />,
  S32: <ProfileScreen />,
  S33: <SettingsScreen />,
  S34: <ClaimBusinessLinkScreen />,
  S35: <NotificationSettingsScreen />,
  S36: <PrivacySettingsScreen />,

  S37: <ClaimRequestFormScreen />,
  S38: <ClaimStatusScreen />,
  S39: <OwnerEditListingScreen />,
  S40: <OwnerProfileScreen />,

  S41: <AdminLoginScreen />,
  S42: <AnalyticsDashboardScreen />,
  S43: <CatalogueListScreen />,
  S44: <CatalogueEditScreen />,
  S45: <BulkImportScreen />,
  S46: <RankingAndTrustScreen />,
  S47: <GemSelectionScreen />,
  S48: <BusinessClaimsQueueScreen />,
  S49: <ReportsAndModerationScreen />,
  S50: <RolesAccountsAuditScreen />,
  S51: <LocationHistoryAccessScreen />,
};

export const screenRoutes = [
  // '/' is not one of the 52 screens — it decides which of two of them an
  // arriving visitor gets (see RootRoute), so it is declared here rather than
  // in the registry, which the dev harness renders as a screen list.
  { path: '/', element: <RootRoute /> },
  ...screenRegistry.map((meta) => ({
    path: meta.path,
    element: elementById[meta.id] ?? <PlaceholderScreen meta={meta} />,
  })),
];
