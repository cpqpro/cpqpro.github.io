history.pushState(JSON.parse(localStorage.getItem('cpq')) || {
  currentProduct: 0,
  product: {},
  products: [],
  route: 'home'
}, 'initial load')

// the router

function route(route) {
  let state = history.state
  const before = Object.assign({}, state)
  state.route = route
  history.pushState(state, route, '/'+route)
  console.log(before, history.state)
  update()
  render()
}

function reset() { localStorage.removeItem('cpq') }

const routeToIdMap = {
  home: 'Page-Home',
  items: 'Page-Items',
  pricing: 'Page-Pricing',
  products: 'Page-Products',
  'products/new': 'Wizard-Product',
  queues: 'Page-Queues',
  quotes: 'Page-Quotes',
  settings: 'Page-Settings',
  tools: 'Page-Tools',
  users: 'Page-Users',
}

// the conductor

function render() {
  const s = history.state
  // grab page template
  document.getElementById('Page-Content').innerHTML = useTemplate(document.getElementById(routeToIdMap[s.route]))
  // post render
  if (s.route === 'products') {
    listProducts()
    if (s.product.name) nextProduct()
  }
}

function useTemplate(el) {
  const tree = el.cloneNode(true)
  tree.querySelectorAll('*[id]').forEach(el => {
    // strip all underscores so no id appears twice
    el.id = el.id.slice(0, -1)
  })
  return tree.outerHTML
}

// event listeners & handlers

document.addEventListener('render', e => route(e.detail.route))

document.addEventListener('click', e => {
  if (e.target.matches('[data-route]')) {
    e.preventDefault()
    handleRoute(e.target)
  }
  if (e.target.matches('[data-tab]')) handleTab(e.target.dataset.tab)
  if (e.target.matches('[data-key]')) viewProduct(e.target.dataset.key)
  if (e.target.matches('.temp-option')) handleOptions(e.target)
})

let ferry = ''

document.addEventListener('keydown', e => {
  const t = e.target
  if (t.tagName === 'INPUT' && e.key === 'Backspace' && getParentIndex(t) && !t.value ) {
    let prev = t.parentNode.previousElementSibling.querySelector('input')
    ferry = prev.value
    prev.focus()
    t.parentNode.remove()
  }
})

document.addEventListener('keyup', e => {
  if (ferry) {
    e.target.value = ferry
    ferry = false
  }
  if (e.target.tagName === 'INPUT') handleInput(e)
  else handleShortcut(e.key)
})

document.addEventListener('change', e => {
  document.getElementById('Preview').className = e.target.value
})

function handleRoute(el) {
  if (el.classList.contains('Tab-Icon-Label')) {
    // remove .selected from siblings
    Array.from(el.parentNode.children).forEach(child => child.classList.remove('selected'))
    // add .selected to clicked element
    el.classList.add('selected')
  }

  // pass route to pub-sub render event
  document.dispatchEvent(new CustomEvent('render', {
    detail: { route: el.dataset.route }
  }))
}

document.addEventListener('tab', e => {
  const page = document.getElementById('Page')
  if (e.detail.tab === 'values') {
    const parent = page.querySelector('.temp-values')
    parent.innerHTML = ''
    const p1 = document.createElement('p')
    p1.textContent = 'For each input, choose a type then add values.'
    parent.appendChild(p1)
    const inputs = history.state.product.inputs
    inputs.forEach((input, i) => {
      const div = document.createElement('div')
      const left = document.createElement('div')
      const h3 = document.createElement('h3')
      h3.textContent = input.text
      left.appendChild(h3)
      const type = document.createElement('div')
      type.className = 'temp-types'
      type.innerHTML = '<div class="selected" data-value="choice"><i class="fas fa-ballot"></i> Multiple choice</div><div data-value="number">Number value</div><div data-value="other">Other <i class="fas fa-angle-down"></i><div>'
      left.appendChild(type)
      const ol = document.createElement('ol')
      if (input.hasOwnProperty('values')) {
        input.values.forEach((value, v) => {
          const li = document.createElement('li')
          const value_x = document.createElement('input')
          value_x.id = 'product_input_'+ (i + 1) +'_value_'+ (v + 1)
          value_x.value = value.text
          li.appendChild(value_x)
          ol.appendChild(li)
        })
      } else {
        const li = document.createElement('li')
        const value_1 = document.createElement('input')
        value_1.id = 'product_input_'+ (i + 1) +'_value_1'
        value_1.placeholder = 'First value…'
        li.appendChild(value_1)
        ol.appendChild(li)
      }
      left.appendChild(ol)
      const p2 = document.createElement('p')
      p2.innerHTML = 'To add another value, press <strong>Enter ↵</strong>'
      left.appendChild(p2)
      if (i === inputs.length - 1) {
        const button = document.createElement('button')
        button.className = 'Button'
        button.dataset.tab = 'save'
        button.textContent = 'Save product'
        left.appendChild(button)
      }
      div.appendChild(left)
      const right = document.createElement('div')
      right.className = 'temp-preview'
      div.appendChild(right)
      parent.appendChild(div)
      renderPreview(div.querySelector('input'), input)
    })
  }
  if (e.detail.tab !== 'save') page.querySelector('.temp-'+ e.detail.tab +' input').focus()
})

function handleTab(tab) {
  const page = document.getElementById('Page')
  page.querySelectorAll('.tab-buttons li').forEach(el => el.classList.remove('active'))
  page.querySelector('[data-tab='+ tab +']').classList.add('active')
  page.querySelectorAll('.tab').forEach(el => el.style.display = 'none')
  page.querySelector('.temp-'+ tab).style.display = 'block'
  document.dispatchEvent(new CustomEvent('tab', { detail: { tab } }))
  
  if (tab === 'save') document.dispatchEvent(new CustomEvent('save'))
}

function handleInput(e) {
  const p = history.state.product
  const t = e.target
  const s = t.id.split('_')
  if (t.id === 'product_name') {
    const h1 = document.querySelector('#Page #Wizard-Product h1')
    if (t.value) {
      h1.textContent = p.name = t.value
    } else {
      h1.textContent = h1.dataset.placeholder
    }
    if (e.key === 'Enter') { handleTab('inputs') }
  } else if (t.id.startsWith('product_input_')) {
    if (!p.hasOwnProperty('inputs')) p.inputs = []
    let obj
    if (s[4]) {
      if (!p.inputs[s[2] - 1].hasOwnProperty('values')) p.inputs[s[2] - 1].values = []
      obj = p.inputs[s[2] - 1].values[s[4] - 1] = {}
    } else {
      obj = p.inputs[s[2] - 1] = {}
    }
    obj.text = t.value
    if (document.getElementById('Preview')) renderFullPreview()
    else renderPreview(t, p.inputs[s[2] - 1])
    if (e.key === 'Enter') {
      const li = document.createElement('li')
      const input = document.createElement('input')
      s.pop()
      input.id = s.join('_') +'_'+ (getParentIndex(t) + 2)
      li.appendChild(input)
      t.parentNode.parentNode.appendChild(li)
      input.focus()
    }
  }
}

function handleShortcut(key) {
  // console.log(key)
  if (key === 'Meta') return
  else if (key === 'Escape') escape()
  else if (key === 'd') toggle('Dev')
  else if (key === 'R') reset()
  else console.warn('Shortcut not recognized')
}

function update() {
  localStorage.setItem('cpq', JSON.stringify(history.state))
}

document.addEventListener('save', e => {
  history.state.product.key = history.state.currentProduct
  history.state.products.push(history.state.product)
  update()
})

function nextProduct() {
  history.state.product = {}
  history.state.currentProduct = history.state.products.length
}

function listProducts() {
  const list = document.getElementById('Products')
  const ps = history.state.products
  if (ps) {
    ps.forEach(product => {
      const item = document.createElement('div')
      item.dataset.key = product.key
      item.innerHTML = product.name
      list.appendChild(item)
    })
  } else list.innerHTML = '<h3>No products, yet!</h3><p>Use the <a href="/products/new" data-route="products/new">Create new product</a> button above.</p>'
}

function viewProduct(key) {
  const route = '/products/view/'+ key
  let state = history.state
  let p = state.product = history.state.products[key]
  history.pushState(state, route, route)
  update()
  
  // custom render()
  const page = document.getElementById('Page-Content')
  page.innerHTML = '<div id="Toolbar-Product"><div><h1>'+ history.state.product.name +' <i class="fas fa-edit"></i></h1></div><div><button>Toggle Preview</button><button class="Button">Save changes</button></div></div>'
  const div = document.createElement('div')
  div.className = 'temp-product'
  const table = document.createElement('div')
  table.className = 'table'
  const rowp = document.createElement('div')
  rowp.className = 'row row-p'
  rowp.innerHTML = '<div class="cell fas fa-file"></div><div class="cell">Page 1</div><div class="cell count">'+ p.inputs.length +' inputs</div><div class="cell action"><i class="fas fa-ellipsis-h"></i></div>'
  table.appendChild(rowp)
  p.hasOwnProperty('inputs') && p.inputs.forEach((input, i) => {
    const rowi = document.createElement('div')
    rowi.className = 'row row-i'
    rowi.innerHTML = '<div class="cell fas fa-angle-down"></div><div class="cell ref">1.'+ (i + 1) +'.</div><input class="cell" id="product_input_'+ (i + 1) +'" value="'+ input.text +'"><select class="cell"><option value="radio_modern">Radio (modern)</option><option value="radio_traditional">Radio (traditional)</option><option value="pulldown_menu">Pulldown menu</option></select><i class="fas fa-caret-down"></i><div class="cell count">'+ (input.hasOwnProperty('values') ? input.values.length : 0) +' values</div><div class="cell action"><i class="fas fa-ellipsis-h"></i></div>'
    table.appendChild(rowi)
    input.hasOwnProperty('values') && input.values.forEach((value, v) => {
      const rowv = document.createElement('div')
      rowv.className = 'row row-v'
      rowv.innerHTML = '<div class="cell fas fa-bars"></div><div class="cell ref">1.'+ (i + 1) +'.'+ (v + 1) +'.</div><input class="cell" id="product_input_'+ (i + 1) +'_value_'+ (v + 1) +'" value="'+ value.text +'"><div class="cell action"><i class="fas fa-image"></i></div><div class="cell action"><i class="fas fa-paperclip"></i></div><div class="cell action"><i class="fas fa-ellipsis-h"></i></div>'
      table.appendChild(rowv)
    })
  })
  const actions = document.createElement('div')
  actions.className = 'row row-a'
  actions.innerHTML = '<div class="cell fas fa-angle-right"></div><div class="cell">Insert <i class="fas fa-arrow-right"></i> <button><i class="fas fa-file"></i> Page</button><button><i class="fas fa-layer-group"></i> Section</button><button disabled><i class="fas fa-code-branch"></i> Subsection</button>'
  table.appendChild(actions)
  div.appendChild(table)
  const preview = document.createElement('div')
  preview.id = 'Preview'
  preview.className = 'radio_modern'
  div.appendChild(preview)
  page.appendChild(div)
  renderFullPreview()
}

const layers = []

function escape() {
  if (layers.length) {
    const front = layers.pop()
    front.style.display = 'none'
  }
}

function toggle(id) {
  const el = document.getElementById(id)
  if (el.offsetParent === null) {
    el.style.display = 'block'
    layers.push(el)
  }
  else {
    el.style.display = 'none'
    layers.pop()
  }
}

function getParentIndex(el) {
  // console.log(el.parentNode.parentNode.children, Array.from(el.parentNode.parentNode.children).indexOf(el.parentNode) + 1)
  return Array.from(el.parentNode.parentNode.children).indexOf(el.parentNode)
}

function renderPreview(el, data) {
  const preview = el.parentNode.parentNode.parentNode.nextElementSibling
  preview.innerHTML = ''
  const frag = document.createDocumentFragment()
  const p = document.createElement('p')
  p.innerHTML = 'Preview'
  frag.appendChild(p)
  const h3 = document.createElement('h3')
  h3.innerHTML = data.text
  frag.appendChild(h3)
  if (data.hasOwnProperty('values')) {
    data.values.forEach((value, i) => {
      const div = document.createElement('div')
      div.className = 'temp-option'+ (!i ? ' selected' : '')
      div.innerHTML = value.text
      frag.appendChild(div)
    })
  }
  preview.appendChild(frag)
}

function renderFullPreview() {
  console.log('Rendering full preview…')
  const preview = document.getElementById('Preview')
  preview.innerHTML = ''
  const p = history.state.product
  // title
  const h1 = document.createElement('h1')
  h1.textContent = p.name
  preview.appendChild(h1)
  // inputs
  p.hasOwnProperty('inputs') && p.inputs.forEach(input => {
    const div = document.createElement('div')
    // div.className = input.style?
    const h3 = document.createElement('h3')
    h3.innerHTML = input.text
    div.appendChild(h3)
    // values
    input.hasOwnProperty('values') && input.values.forEach((value, i) => {
      const v = document.createElement('div')
      v.className = 'temp-option'+ (i ? '' : ' selected')
      v.innerHTML = value.text
      div.appendChild(v)
    })
    preview.appendChild(div)
  })
  // build
  const button = document.createElement('button')
  button.className = 'Button'
  button.textContent = 'Build configuration'
  preview.appendChild(button)
}

function handleOptions(el) {
  // remove .selected from siblings
  Array.from(el.parentNode.children).forEach(child => child.classList.remove('selected'))
  // add .selected to clicked element
  el.classList.add('selected')
}

// init

render()