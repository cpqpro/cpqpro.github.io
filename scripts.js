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
    renderPreview(t, p.inputs[s[2] - 1])
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
  else if (key === 'r') reset()
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
  history.state.products.forEach(product => {
    const item = document.createElement('div')
    item.dataset.key = product.key
    item.innerHTML = product.name
    list.appendChild(item)
  })
}

function viewProduct(key) {
  history.state.product = history.state.products[key]
  alert('Viewing product:'+ history.state.product.name)
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

// init

render()