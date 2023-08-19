# Legend State Linter

## Introduction

[Legend State](https://github.com/LegendApp/legend-state) is a new state management library focused 4 primary goals:

1. Ease of use
2. Being the fastest React state management library
3. Fine grained reactivity
4. Powerful persistence.

While some concepts are well established Legend State introduces several new concepts that can require thinking about state management and rendering in a new way. To facilitate this new way of thinking we created this library to make it easier to write idiomatic Legend State.

## Checks

- Observables end in $
- the `use` method on observables can only be used within React components
- Recommend replacing single `get()` method calls in `useSelector` with `.use()` on the variable.
