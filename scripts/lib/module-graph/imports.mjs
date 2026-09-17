import assert from 'node:assert/strict';
import { parse } from '@babel/parser';

/** Parse syntax, never evaluate a product module or recover from a parse error. */
export function collectModuleImports(source, filename = 'module.ts') {
  const ast = parse(source, {
    sourceType: 'module', sourceFilename: filename,
    plugins: filename.endsWith('.ts') ? ['typescript'] : [],
    createImportExpressions: true,
  });
  const edges = [];
  const add = (node, argument, kind, phase) => {
    let specifier;
    if (argument?.type === 'StringLiteral') specifier = argument.value;
    else if (argument?.type === 'TemplateLiteral' && argument.expressions.length === 0) {
      specifier = argument.quasis[0].value.cooked;
    }
    assert.equal(typeof specifier, 'string', `${filename}:${node.loc?.start.line}: unsupported computed ${kind}`);
    assert.ok(specifier.length > 0, `${filename}: empty module specifier`);
    edges.push({ kind, phase, specifier, line: node.loc.start.line });
  };
  const pending = [ast.program];
  while (pending.length) {
    const node = pending.pop();
    switch (node.type) {
      case 'ImportDeclaration': {
        const types = node.specifiers.filter((item) => item.importKind === 'type').length;
        const phase = node.importKind === 'type' ? 'type'
          : types === node.specifiers.length ? 'evaluation'
          : types > 0 ? 'mixed' : 'value';
        add(node, node.source, 'import', phase);
        break;
      }
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        if (node.source) {
          const specifiers = node.specifiers ?? null;
          const types = specifiers?.filter((item) => item.exportKind === 'type').length ?? 0;
          const phase = node.exportKind === 'type' ? 'type'
            : specifiers !== null && types === specifiers.length ? 'evaluation'
            : types > 0 ? 'mixed' : 'value';
          add(node, node.source, 'export', phase);
        }
        break;
      case 'ImportExpression':
        add(node, node.source, 'dynamic-import', 'value');
        break;
      case 'TSImportType':
        add(node, node.argument, 'import-type', 'type');
        break;
      case 'TSImportEqualsDeclaration':
        throw new Error(`${filename}:${node.loc.start.line}: unsupported import-equals; use the package ESM contract`);
      case 'TSModuleDeclaration':
        assert.notEqual(node.id.type, 'StringLiteral', `${filename}: ambient module/augmentation needs explicit graph support`);
        break;
      case 'CallExpression':
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
          throw new Error(`${filename}:${node.loc.start.line}: unsupported require; use the package ESM contract`);
        }
        break;
    }
    // Walk syntax nodes, including type queries and expressions inside templates.
    // Strings, comments, regular expressions, locations and token metadata are not syntax children.
    const children = [];
    for (const [key, value] of Object.entries(node)) {
      if (['loc', 'start', 'end', 'extra', 'comments', 'leadingComments', 'trailingComments', 'innerComments'].includes(key)) continue;
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child.type === 'string') children.push(child);
      } else if (value && typeof value.type === 'string') children.push(value);
    }
    pending.push(...children.reverse());
  }
  return edges;
}
