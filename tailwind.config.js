const path = require('path');

const spacing = Array(100)
    .fill('$')
    .map((_, index) => index + 1)
    .reduce((spacing, index) => {
        spacing[index] = `${index / 4}rem`;
        return spacing;
    }, {});

module.exports = {
    content: [path.resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')],
    theme: {
        extend: {
            spacing,
        },
    },
};
