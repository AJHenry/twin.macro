import dlv from 'dlv'
import { replaceWithLocation, astify } from './../macroHelpers'
import { getTheme, assert } from './../utils'
import { logGeneralError, themeErrorNotFound } from './../logging'

const getFunctionValue = path => {
  if (path.parent.type !== 'CallExpression') return

  const parent = path.findParent(x => x.isCallExpression())
  if (!parent) return

  const argument = parent.get('arguments')[0] || ''

  return { parent, input: argument && argument.evaluate().value }
}

const getTaggedTemplateValue = path => {
  if (path.parent.type !== 'TaggedTemplateExpression') return

  const parent = path.findParent(x => x.isTaggedTemplateExpression())
  if (!parent) return
  if (parent.node.tag.type !== 'Identifier') return

  return { parent, input: parent.get('quasi').evaluate().value }
}

const trimInput = themeValue => {
  const arrayValues = themeValue.split('.').filter(Boolean)
  if (arrayValues.length === 1) {
    return arrayValues[0]
  }

  return arrayValues.slice(0, -1).join('.')
}

const handleThemeFunction = ({ references, t, state }) => {
  if (!references.theme) return

  const theme = getTheme(state.config.theme)

  references.theme.forEach(path => {
    const { input, parent } =
      getTaggedTemplateValue(path) || getFunctionValue(path) || ''

    assert(!parent, () =>
      logGeneralError(
        "The theme value doesn’t look right\n\nTry using it like this: theme`colors.black` or theme('colors.black')"
      )
    )

    const themeValue = theme(input)
    assert(!themeValue, () =>
      themeErrorNotFound({
        theme: input.includes('.') ? dlv(theme(), trimInput(input)) : theme(),
        input,
        trimInput: trimInput(input),
      })
    )

    return replaceWithLocation(parent, astify(themeValue, t))
  })
}

export { handleThemeFunction }
