// masks.js
export const maskCreditCard = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo que não é dígito
    .replace(/(\d{4})(\d)/, '$1 $2') // Coloca um espaço após 4 caracteres
    .replace(/(\d{4})(\d)/, '$1 $2') // Coloca um espaço após mais 4 caracteres
    .replace(/(\d{4})(\d)/, '$1 $2') // Coloca um espaço após mais 4 caracteres
    .replace(/(\d{4})(\d{1,4})/, '$1 $2') // Coloca um espaço após mais 4 caracteres
    .replace(/( \d{4})\d+?$/, '$1'); // Não deixa digitar mais que 16 números
};

export const maskExpiryDate = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo que não é dígito
    .replace(/(\d{2})(\d)/, '$1/$2') // Coloca uma barra entre mês e ano
    .replace(/(\/\d{2})\d+?$/, '$1'); // Não deixa digitar mais que o ano com 2 dígitos
};

export const maskCVV = (value) => {
  return value.replace(/\D/g, '').slice(0, 4); // Aceita até 4 dígitos (AMEX tem 4)
};

export const maskCPF = (value) => {
  return value
    .replace(/\D/g, '') // Remove tudo que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto depois de 3 dígitos
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto depois de mais 3 dígitos
    .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen depois de mais 3 dígitos
    .replace(/(-\d{2})\d+?$/, '$1'); // Não deixa digitar mais nada
};