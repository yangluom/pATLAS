/**
 * function to repopulate #displayCurrentBox
 * @param array
 */
const resetDisplayTaxaBox = (array) => {
  for (let x = 0; x < array.length; x++) {
    // empty field
    $(`#${array[x]}`).empty()
    // reset to default of html
      .append(`${array[x].replace("p_", "")}:`)
  }
}

// function to remove taxa elements from div with main control string
const taxaElementsToString = (taxaElements) => {
  const starter = taxaElements[0] + ":"
  const allOthers = taxaElements.slice(1, taxaElements.length)
  return (starter + allOthers.toString())
}

// function that controls if taxa is present in div and adds or removes
// depending if it is already there or not
const filterDisplayer = (taxaName, stringClass, divStringClass) => {
  const taxaElements = $(divStringClass).html().split(/[:,]/)
  const taxaToParse = " " + taxaName + ","
  if (taxaElements.indexOf(taxaToParse.replace(",", "")) > -1) {
    console.log("test_taxael")
    // remove string from array
    const index = taxaElements.indexOf(taxaToParse.replace(",", "")) // gets
    // the index of the string if higher than -1 then remove it
    if (index !== -1) {
      taxaElements.splice(index, 1)
      $(divStringClass).empty()
        .append(taxaElementsToString(taxaElements))
    }
  } else {
    console.log("divString: ", divStringClass)
    // if not already in taxaElements then add it
    $(divStringClass).append(taxaToParse)
  }
}


/**
 * Function similar to filterDisplayer but specific for project imports since
 * projects select automatically the dropdown menus based on the projectJson
 * object imported
 * @param {String} taxaName - the string with the taxa name
 * @param {String} stringClass - the string class for the taxa level
 * @param {String} divStringClass - the div which stores the strings in the
 * modal displayer
 */
const filterDisplayerProjects = (taxaName, stringClass, divStringClass) => {
  const taxaElements = $(divStringClass).html().split(/[:,]/)
  const taxaToParse = " " + taxaName + ","
  if (taxaElements.indexOf(taxaToParse.replace(",", "")) <= 0) {
    $(divStringClass).append(taxaToParse)
  }
}
