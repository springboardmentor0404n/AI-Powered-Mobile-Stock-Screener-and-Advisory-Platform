import React from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  ButtonText,
  Input,
  InputField,
  Text,
  VStack,
  HStack,
  Checkbox,
  CheckboxIndicator,
  CheckboxIcon,
  CheckboxLabel,
  Heading,
  Icon,
  CloseIcon,
  Pressable,
} from '@gluestack-ui/themed';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (email: string, password: string) => void;
}

export function LoginDialog({ isOpen, onClose, onLogin }: LoginDialogProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);

  const handleLogin = () => {
    if (onLogin) {
      onLogin(email, password);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent maxWidth="$96" bg="$white" borderRadius="$xl" p="$6">
        <ModalHeader>
          <VStack space="sm" alignItems="center" width="$full">
            <VStack
              width="$11"
              height="$11"
              borderRadius="$full"
              borderWidth="$1"
              borderColor="$borderLight200"
              alignItems="center"
              justifyContent="center"
              bg="$backgroundLight0"
            >
              <Icon as={CloseIcon} size="xl" color="$textLight800" />
            </VStack>
            <Heading size="lg">Welcome back</Heading>
            <Text size="sm" color="$textLight600" textAlign="center">
              Enter your credentials to login to your account.
            </Text>
          </VStack>
        </ModalHeader>

        <ModalBody>
          <VStack space="md">
            <VStack space="xs">
              <Text size="sm" fontWeight="$medium">
                Email
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  placeholder="hi@yourcompany.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Input>
            </VStack>

            <VStack space="xs">
              <Text size="sm" fontWeight="$medium">
                Password
              </Text>
              <Input variant="outline" size="md">
                <InputField
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </Input>
            </VStack>

            <HStack justifyContent="space-between" alignItems="center">
              <Checkbox
                value="remember"
                isChecked={rememberMe}
                onChange={setRememberMe}
                size="sm"
              >
                <CheckboxIndicator>
                  <CheckboxIcon />
                </CheckboxIndicator>
                <CheckboxLabel ml="$2">
                  <Text size="sm" color="$textLight600">
                    Remember me
                  </Text>
                </CheckboxLabel>
              </Checkbox>

              <Pressable>
                <Text size="sm" color="$primary600" textDecorationLine="underline">
                  Forgot password?
                </Text>
              </Pressable>
            </HStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <VStack space="md" width="$full">
            <Button onPress={handleLogin} bg="$primary600">
              <ButtonText>Sign in</ButtonText>
            </Button>

            <HStack space="md" alignItems="center" justifyContent="center">
              <VStack flex={1} height="$px" bg="$borderLight200" />
              <Text size="xs" color="$textLight600">
                Or
              </Text>
              <VStack flex={1} height="$px" bg="$borderLight200" />
            </HStack>

            <Button variant="outline" action="secondary">
              <ButtonText>Login with Google</ButtonText>
            </Button>
          </VStack>
        </ModalFooter>

        <ModalCloseButton>
          <Icon as={CloseIcon} />
        </ModalCloseButton>
      </ModalContent>
    </Modal>
  );
}
