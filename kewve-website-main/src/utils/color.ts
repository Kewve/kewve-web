export const backgroundColors = ['#F6D17A', '#ABAED3', '#B9E1F5', '#6F9E82', '#FEF7B8', '#AECF86'];

export function getRandomColor() {
  return (
    'rgb(' +
    (Math.floor(Math.random() * 56) + 200) +
    ', ' +
    (Math.floor(Math.random() * 56) + 200) +
    ', ' +
    (Math.floor(Math.random() * 56) + 200) +
    ')'
  );
}
