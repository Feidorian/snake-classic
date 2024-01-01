'use client'
import dynamic from 'next/dynamic'
const Sketch = dynamic(() => import(/* webpackIgnore: true */'react-p5').then((mod) => mod.default), {
  ssr: false,
})

export default Sketch;