import { getConfigProperties } from './configHelpers'
import { cssify } from './getStyles'
import { debugPlugins } from './logging'
import { getStyledConfig } from './macro/styled'
import getUserPluginData from './utils/getUserPluginData'

const twr = className =>
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

export default twr
