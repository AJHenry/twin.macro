/* eslint-disable complexity */
import { createMacro } from 'babel-plugin-macros'
import {
  validateImports,
  setStyledIdentifier,
  setCssIdentifier,
  generateUid,
} from './macroHelpers'
import { isEmpty } from './utils'
import { getConfigProperties } from './configHelpers'
import {
  getCssConfig,
  updateCssReferences,
  addCssImport,
  maybeAddCssProperty,
} from './macro/css'
import {
  getStyledConfig,
  updateStyledReferences,
  addStyledImport,
} from './macro/styled'
import { handleThemeFunction } from './macro/theme'
import { handleGlobalStylesFunction } from './macro/GlobalStyles'
import { handleTwProperty, handleTwFunction } from './macro/tw'
import getUserPluginData from './utils/getUserPluginData'
import { debugPlugins } from './logging'
import { cssify } from './getStyles'

const getPackageUsed = ({ config: { preset }, cssImport, styledImport }) => ({
  isEmotion: preset === 'emotion' || cssImport.from.includes('emotion'),
  isStyledComponents:
    preset === 'styled-components' ||
    cssImport.from.includes('styled-components'),
  isGoober:
    preset === 'goober' ||
    styledImport.from.includes('goober') ||
    cssImport.from.includes('goober'),
})

const twinMacro = ({ babel: { types: t }, references, state, config }) => {
  validateImports(references)

  const program = state.file.path
  const { configExists, tailwindConfig } = getConfigProperties(state, config)

  state.configExists = configExists
  state.config = tailwindConfig
  state.hasSuggestions =
    typeof config.hasSuggestions === 'undefined'
      ? true
      : Boolean(config.hasSuggestions)
  state.allowStyleProp =
    typeof config.allowStyleProp === 'undefined'
      ? false
      : Boolean(config.allowStyleProp)

  state.tailwindConfigIdentifier = generateUid('tailwindConfig', program)
  state.tailwindUtilsIdentifier = generateUid('tailwindUtils', program)

  /* eslint-disable-next-line unicorn/prevent-abbreviations */
  const isDev =
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'dev' ||
    false
  state.isDev = isDev
  state.isProd = !isDev

  state.debugProp = isDev ? Boolean(config.debugProp) : false
  state.debug = isDev ? Boolean(config.debug) : false

  state.userPluginData = getUserPluginData({ config: state.config })
  isDev &&
    Boolean(config.debugPlugins) &&
    state.userPluginData &&
    debugPlugins(state.userPluginData)

  // Styled import
  const styledImport = getStyledConfig(config)
  state.styledImport = styledImport

  // Init identifiers
  state.styledIdentifier = null
  state.cssIdentifier = null

  // Css import
  const cssImport = getCssConfig(config)
  state.cssImport = cssImport

  const packageUsed = getPackageUsed({ config, cssImport, styledImport })
  for (const [key, value] of Object.entries(packageUsed)) state[key] = value

  // Sassy pseudo prefix (eg: the & in &:hover)
  state.sassyPseudo =
    config.sassyPseudo !== undefined
      ? config.sassyPseudo === true
      : state.isGoober

  // Group traversals together for better performance
  program.traverse({
    ImportDeclaration(path) {
      setStyledIdentifier({ state, path, styledImport })
      setCssIdentifier({ state, path, cssImport })
    },
    JSXAttribute(path) {
      handleTwProperty({ path, t, state })
    },
  })

  if (state.styledIdentifier === null) {
    state.styledIdentifier = generateUid('styled', program)
  } else {
    state.existingStyledIdentifier = true
  }

  if (state.cssIdentifier === null) {
    state.cssIdentifier = generateUid('css', program)
  } else {
    state.existingCssIdentifier = true
  }

  handleTwFunction({ references, t, state })

  state.isImportingCss =
    !isEmpty(references.css) && !state.existingCssIdentifier

  // GlobalStyles import
  handleGlobalStylesFunction({ references, program, t, state, config })

  // Css import
  updateCssReferences(references.css, state)
  if (state.isImportingCss) {
    addCssImport({ program, t, cssImport, state })
  }

  // Styled import
  updateStyledReferences(references.styled, state)
  if (!isEmpty(references.styled)) state.shouldImportStyled = true
  if (state.shouldImportStyled && !state.existingStyledIdentifier) {
    addStyledImport({ program, t, styledImport, state })
  }

  // Theme import
  handleThemeFunction({ references, t, state })

  // Auto add css prop for styled components
  if (
    (state.hasTwProp || state.hasCssProp) &&
    config.autoCssProp === true &&
    state.isStyledComponents
  ) {
    maybeAddCssProperty({ program, t })
  }

  program.scope.crawl()
}

export default createMacro(twinMacro, { configName: 'twin' })

export const twr = className =>
  ((
    className,
    state = { file: { opts: { sourceRoot: '.' } }, debug: true },
    config = { debug: true },
    t = {}
  ) => {
    const { configExists, tailwindConfig } = getConfigProperties(state, config)

    state.configExists = configExists
    state.config = tailwindConfig
    state.hasSuggestions =
      typeof config.hasSuggestions === 'undefined'
        ? true
        : Boolean(config.hasSuggestions)
    state.allowStyleProp =
      typeof config.allowStyleProp === 'undefined'
        ? false
        : Boolean(config.allowStyleProp)

    /* eslint-disable-next-line unicorn/prevent-abbreviations */
    const isDev =
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'dev' ||
      false
    state.isDev = isDev
    state.isProd = !isDev

    state.debugProp = isDev ? Boolean(config.debugProp) : false
    state.debug = isDev ? Boolean(config.debug) : false

    state.userPluginData = getUserPluginData({ config: state.config })
    isDev &&
      Boolean(config.debugPlugins) &&
      state.userPluginData &&
      debugPlugins(state.userPluginData)

    // Styled import
    const styledImport = getStyledConfig(config)
    state.styledImport = styledImport

    // Sassy pseudo prefix (eg: the & in &:hover)
    state.sassyPseudo =
      config.sassyPseudo !== undefined
        ? config.sassyPseudo === true
        : state.isGoober

    if (state.styledIdentifier === null) {
      state.styledIdentifier = 'uuid3'
    } else {
      state.existingStyledIdentifier = true
    }

    if (state.cssIdentifier === null) {
      state.cssIdentifier = 'uuid4'
    } else {
      state.existingCssIdentifier = true
    }

    return cssify(className, t, state)
  })(className)
