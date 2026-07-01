module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/'],
  dependencies: {
    'react-native-permissions': {
      platforms: {
        android: {
          packageImportPath: 'import com.reactnativecommunity.rnpermissions.RNPermissionsPackage;',
        },
      },
    },
  },
};
