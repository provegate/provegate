export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // scope is encouraged, never blocking
    'scope-empty': [1, 'never'],
  },
};
