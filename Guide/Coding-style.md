# RtDt coding style

This document records the project's preferred style for future changes and the planned manual refactor pass. It does **not** assert that all existing source files conform yet.

## Function body spacing

After the opening `{` of a function definition, include a **blank whitespace-only line** before the first statement. A function body therefore begins with the opening brace, then a newline, then a blank indented line, then the first statement.

Preferred:

```javascript
function trace_ray(world, ray) {

    const intersections = intersect_world(world, ray);
    return hit(intersections);
}
```

This rule applies to function declarations, function expressions, methods and callbacks when formatted as multiline bodies. Keep the intervening line empty of comments and statements. In newly written or modified functions, follow this convention; do not churn unrelated files purely to enforce it.

## Refactor considerations

Preserve observable behaviour when reformatting. Perform function-structure changes separately from algorithm changes, and run `npm test` plus the CLI render verification after changes. The browser and CLI currently have separate scanline render loops.
