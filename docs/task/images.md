# Image

To add an image, simply use the classic Markdown syntax:

```md
![description](image.jpg)
```

You can also generate images using [asymptote](https://asymptote.sourceforge.io/); the code is automatically compiled and converted into a vector image:

```md
![description](image.asy)
```

Images can be resized by adding parameters after the filename:

```md
![description](image.jpg?s=2)
```

The parameters that can be used are:

- `w`: changes the width of the image while maintaining aspect ratio;
- `h`: changes the height of the image while maintaining aspect ratio;
- `s`: multiplies the width and height of the image by the specified value.

::: tip
`w` and `h` can be used together; in this case, the image is resized without maintaining aspect ratio.
:::
