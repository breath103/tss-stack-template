# Prefer functional style when it reduces indentation

Use `.forEach()`, `.map()`, `.filter()` over `for...of` when iterating entries/values — it keeps the data flow flat. Reserve `for...of` only when you need early `return`/`break` from the enclosing function.

```typescript
// ✅ Correct - flat, functional
entries(methods).forEach(([name, method]) => {
  instance[name] = buildHandler(method);
});
```

```typescript
// ❌ Wrong - unnecessary indentation from for...of destructuring
for (const [name, method] of entries(methods)) {
  instance[name] = buildHandler(method);
}
```
