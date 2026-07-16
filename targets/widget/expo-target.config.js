/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'FilWidgets',
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#F2A65A',
    $widgetBackground: { color: '#FBF6EF', darkColor: '#1B1B3A' },
  },
  entitlements: {
    'com.apple.security.application-groups': [
      'group.com.fil.couple.widgets',
    ],
  },
});
