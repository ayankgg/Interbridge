import React from 'react';
import { Box, H2, H5, Text, FormGroup, Label, Input, Button, MessageBox, Illustration } from '@adminjs/design-system';

const MESSAGES: Record<string, string> = {
  invalidCredentials: 'Wrong email and/or password',
  tooManyRequests: 'Too many login attempts — please wait a bit and try again',
};

interface LoginPageProps {
  action: string;
  message?: string | null;
  clientUrl: string;
}

// Custom AdminJS login page (wired via admin.overrideLogin in ./setup) — same
// form contract as the default (POST to `action`, fields named email/password)
// so the built-in auth flow is untouched. Only adds a way back to the
// consumer-facing app, which the default template has no room for.
//
// `overrideLogin`'s type isn't generic at the call site, so AdminJS expects
// FC<Record<string, unknown>> here — cast internally to keep this component's
// own props typed.
export function LoginPage(rawProps: Record<string, unknown>) {
  const { action, message, clientUrl } = rawProps as unknown as LoginPageProps;
  const errorMessage = message ? MESSAGES[message] ?? message : null;

  return (
    <>
      <style>{'html, body, #app { width: 100%; height: 100%; margin: 0; padding: 0; }'}</style>
      <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column" height="100%" bg="grey20">
        <Box mb="lg">
          <Button as="a" href={clientUrl} variant="text" size="sm">
            ← Back to InternBridge
          </Button>
        </Box>

        <Box bg="white" height="440px" flex boxShadow="login" width={[1, 2 / 3, 'auto']}>
          <Box
            bg="primary100"
            color="white"
            p="x3"
            width="380px"
            flexGrow={0}
            display={['none', 'none', 'block']}
            position="relative"
          >
            <H2 fontWeight="lighter">Welcome</H2>
            <Text fontWeight="lighter" mt="default">
              to the InternBridge admin panel — manage students, companies, internships and more.
            </Text>
            <Text textAlign="center" p="xxl">
              <Box display="inline" mr="default">
                <Illustration variant="Planet" width={82} height={91} />
              </Box>
              <Box display="inline">
                <Illustration variant="Astronaut" width={82} height={91} />
              </Box>
              <Box display="inline" position="relative" top="-20px">
                <Illustration variant="FlagInCog" width={82} height={91} />
              </Box>
            </Text>
          </Box>

          <Box as="form" action={action} method="POST" p="x3" flexGrow={1} width={['100%', '100%', '480px']}>
            <H5 marginBottom="xxl">InternBridge Admin</H5>

            {errorMessage && (
              <MessageBox my="lg" message={errorMessage} variant="danger" />
            )}

            <FormGroup>
              <Label required>Email</Label>
              <Input name="email" placeholder="Email" />
            </FormGroup>
            <FormGroup>
              <Label required>Password</Label>
              <Input type="password" name="password" placeholder="Password" autoComplete="new-password" />
            </FormGroup>

            <Text mt="xl" textAlign="center">
              <Button variant="primary">Log in</Button>
            </Text>

            <Text mt="xl" textAlign="center" fontSize="sm">
              Looking for the student or company portal?{' '}
              <a href={clientUrl}>Go to InternBridge</a>
            </Text>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default LoginPage;
