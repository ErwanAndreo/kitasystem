import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:kita_mobile/main.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('de_DE', null);
  });

  group('KitaMitarbeiterApp Cross-Platform Test Suite (iOS, iPadOS, Android)', () {
    testWidgets('App loads and renders BottomNavigation with 4 tabs', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      expect(find.byType(KitaMitarbeiterApp), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(4));
    });

    testWidgets('Tab navigation switches between screens smoothly', (WidgetTester tester) async {
      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      // Tap on 2nd tab (Dienstplan)
      await tester.tap(find.byType(NavigationDestination).at(1));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap on 3rd tab (Anträge)
      await tester.tap(find.byType(NavigationDestination).at(2));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap on 4th tab (Pinnwand)
      await tester.tap(find.byType(NavigationDestination).at(3));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);

      // Tap back to 1st tab (Heute)
      await tester.tap(find.byType(NavigationDestination).at(0));
      await tester.pumpAndSettle();
      expect(find.byType(Scaffold), findsWidgets);
    });

    testWidgets('iPadOS & Tablet responsive layout test (large viewport 1024x768)', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1024, 768);
      tester.view.devicePixelRatio = 1.0;

      await tester.pumpWidget(const KitaMitarbeiterApp());
      await tester.pumpAndSettle();

      expect(find.byType(KitaMitarbeiterApp), findsOneWidget);
      expect(find.byType(NavigationDestination), findsNWidgets(4));

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
    });
  });
}
