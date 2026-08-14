// `jest.setup.js` imports this at runtime, but it's a .js file and tsconfig's
// include is `**/*.ts`, so the module never entered the TS program and its
// global augmentation of `jest.Matchers` never loaded — leaving every
// `toBeInTheDocument()` call a type error. This pulls it in for type-checking.
import '@testing-library/jest-dom'
